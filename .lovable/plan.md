## Mục tiêu

1. Thay hoàn toàn hệ thống OTP dựa trên Resend bằng **Supabase Auth Email OTP** (email OTP tích hợp sẵn của Lovable Cloud), gỡ mọi phụ thuộc Resend.
2. Sửa lỗi vỡ khung + chữ mờ nhoè ở các thẻ danh hiệu trong "🌿 Hành Trình Tiến Hoá Của Bạn".

## 1) Bối cảnh quan trọng (cần đọc trước khi implement)

Tài khoản trong app **không phải Supabase Auth users** — mật khẩu nằm trong bảng `public.accounts` (`password_hash`, bcrypt) và login qua RPC `login_account`. Vì vậy `supabase.auth.updateUser({ password })` mặc định sẽ chỉ cập nhật `auth.users`, **không** đổi được mật khẩu tài khoản app.

Giải pháp giữ đúng tinh thần yêu cầu (dùng Supabase Auth Email OTP làm cơ chế xác thực email, bỏ Resend hoàn toàn):

- Dùng `supabase.auth.signInWithOtp` + `supabase.auth.verifyOtp` để **xác minh quyền sở hữu email** (Supabase tự gửi email OTP 6 số qua email service mặc định của Lovable Cloud — không cần Resend, không cần cấu hình domain).
- Sau khi `verifyOtp` thành công, người dùng đã có Supabase session gắn với chính email đó. Frontend gọi 1 RPC mới `reset_password_by_verified_email(p_new_password)` — SECURITY DEFINER, lấy email từ `auth.jwt()`, đối chiếu `accounts.email` và cập nhật `password_hash`. Không cần truyền email từ client, chống mọi bypass.
- Cuối flow, `supabase.auth.signOut()` để không để lại session "ma" (app vẫn dùng session localStorage riêng).
- `shouldCreateUser: true` khi gọi `signInWithOtp` (bắt buộc, vì các user hiện tại chưa có trong `auth.users`). RPC vẫn từ chối nếu email đó không tồn tại trong `accounts`, nên không có nguy cơ tạo account "lạ".

## 2) Thay đổi database (migration mới)

- Tạo RPC `public.reset_password_by_verified_email(p_new_password text) returns boolean`
  - SECURITY DEFINER, `search_path = public, extensions`
  - Đọc email từ `auth.jwt() ->> 'email'`; ném lỗi nếu null.
  - Kiểm tra tồn tại account với email đó; nếu không có → "Không tìm thấy tài khoản với email này".
  - Validate độ dài mật khẩu 6–72.
  - `UPDATE public.accounts SET password_hash = crypt(...), updated_at = now() WHERE lower(email) = ...`.
  - `GRANT EXECUTE ... TO authenticated`.
- Không tạo bảng mới → không cần GRANT bảng.
- Có thể giữ lại `password_reset_otps` và các RPC cũ (`request_password_reset_otp`, `verify_otp_and_reset`) — không dùng nữa nhưng không xoá để tránh phá lịch sử; hoặc `DROP FUNCTION` cả hai trong cùng migration cho gọn. **Chọn DROP** để đúng tiêu chí "clean up".

## 3) Thay đổi code

**Xoá:**
- `src/routes/api/public/send-otp.ts` (toàn bộ endpoint Resend).
- `docs/PASSWORD_RECOVERY.md`, `docs/SETUP.md` phần Resend (cập nhật ngắn gọn, không tham chiếu Resend/`RESEND_API_KEY`/`onboarding@resend.dev` nữa).
- Secret `RESEND_API_KEY` → yêu cầu người dùng xoá qua UI (không thể xoá tự động ở plan này; sẽ note lại). Loại bỏ mọi tham chiếu trong code.

**Sửa `src/components/BionovaLegacy.jsx`:**
- `handleRequestOtp`:
  ```js
  await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
  ```
  - Bỏ toàn bộ `fetch('/api/public/send-otp')`, `forgotDevOtp`, `body.warning`, message "dev OTP".
  - Loading + thông báo: "✅ Đã gửi mã OTP 6 số đến email. Kiểm tra hộp thư (kể cả Spam)."
  - Map lỗi rõ ràng: rate limit, email không hợp lệ.
- `handleVerifyOtp`:
  ```js
  const { error: vErr } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
  if (vErr) → "Mã OTP không đúng hoặc đã hết hạn"
  const { error: rErr } = await supabase.rpc('reset_password_by_verified_email', { p_new_password: forgotNewPwd })
  await supabase.auth.signOut()
  ```
  - Thông báo lỗi: OTP sai / hết hạn / email không tồn tại / mật khẩu quá ngắn.
  - Thành công: giữ nguyên toast + auto-close modal như hiện tại.
- Xoá state `forgotDevOtp` và block JSX render dev OTP (nếu có).
- Không đổi bố cục, class, cấu trúc modal Quên mật khẩu.

**Sửa `src/routeTree.gen.ts`:** file auto-generated — không sửa tay, sẽ tự cập nhật khi xoá route file.

**Cấu hình auth:** gọi `supabase--configure_auth` để đảm bảo signup không bị disable (OTP cần tạo `auth.users` row). Không bật auto-confirm (không cần cho OTP flow), không bật anonymous.

## 4) Fix UI "Hành Trình Tiến Hoá"

Nguyên nhân "vỡ khung + chữ mờ nhoè":
- Các thẻ dùng `scale-105` + `animate-pulse` trong container `overflow-x-auto` → nội dung tràn cắt phần scale, tạo cảm giác "vỡ khung".
- `text-[10px]` + `line-clamp-2` + `leading-tight` + nền gradient mờ khiến chữ khó đọc.
- Nền `bg-teal-500/[0.15]` + `animate-pulse` áp lên chữ → hiệu ứng nhoè.

Sửa:
- Bỏ `scale-105` trên `isCurrent`/`isChosen`/hover; thay bằng border dày hơn + shadow (không transform).
- Bỏ `animate-pulse` trên toàn bộ card; giữ pulse chỉ trên viền/chấm nhỏ nếu cần.
- Tăng `w-24` → `w-28`, tăng padding từ `p-2.5` → `p-3`, thêm `pt-2` cho container để scale (nếu còn) không bị cắt.
- Chữ tên danh hiệu: `text-[11px]` → `text-xs`, `font-bold`, `text-slate-100`, `line-clamp-2`, thêm `min-h-[2.25rem]` để cao đều.
- Điểm min: `text-[10px] text-slate-400` (rõ hơn).
- Container ngoài: thêm `py-2` để không cắt shadow.
- Đổi `bg-teal-500/[0.15]` thành `bg-teal-500/20` + `ring-2 ring-teal-400/50` cho trạng thái current, rõ nét hơn.

## 5) Kiểm tra sau khi build

- Vào Quên mật khẩu → nhập email tồn tại → nhận email OTP từ Supabase → nhập OTP + mật khẩu mới → login lại bằng mật khẩu mới thành công.
- Email không tồn tại trong `accounts` → OTP vẫn gửi (Supabase Auth), nhưng RPC trả lỗi "Không tìm thấy tài khoản" ở bước cuối → hiển thị đúng.
- Không còn request nào tới `/api/public/send-otp` hay `api.resend.com`.
- Tab Cài đặt: các thẻ danh hiệu hiển thị rõ chữ, không cắt viền/shadow, hover mượt.

## Ghi chú cho người dùng

- Secret `RESEND_API_KEY` không còn được dùng — có thể xoá thủ công trong Backend → Secrets.
- Email OTP của Supabase gửi từ domain mặc định của Lovable Cloud; nếu muốn brand riêng, có thể set up email domain sau (không bắt buộc cho flow này).
