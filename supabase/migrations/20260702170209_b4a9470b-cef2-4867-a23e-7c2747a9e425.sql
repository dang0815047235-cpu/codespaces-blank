
-- 1. Thêm email vào accounts
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_unique ON public.accounts (lower(email)) WHERE email IS NOT NULL;

-- 2. Bảng OTP
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_email ON public.password_reset_otps(lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.password_reset_otps TO authenticated;
GRANT ALL ON public.password_reset_otps TO service_role;
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;
-- Chỉ truy cập qua RPC (security definer), khoá hết mọi client
CREATE POLICY "no_direct_access_otp" ON public.password_reset_otps FOR ALL USING (false) WITH CHECK (false);

-- 3. Cập nhật register_account: nhận thêm email
CREATE OR REPLACE FUNCTION public.register_account(p_username text, p_real_name text, p_password text, p_email text DEFAULT NULL)
RETURNS accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_role text := 'user';
  v_uname text := lower(trim(p_username));
  v_rname text := trim(p_real_name);
  v_email text := NULLIF(lower(trim(coalesce(p_email,''))), '');
  v_admin_exists boolean;
  v_row public.accounts;
BEGIN
  IF v_uname !~ '^[a-z0-9_]{3,24}$' THEN RAISE EXCEPTION 'Username phải 3-24 ký tự (chữ thường, số, gạch dưới)'; END IF;
  IF char_length(v_rname) < 1 OR char_length(v_rname) > 60 THEN RAISE EXCEPTION 'Tên thật phải từ 1-60 ký tự'; END IF;
  IF char_length(p_password) < 6 OR char_length(p_password) > 72 THEN RAISE EXCEPTION 'Mật khẩu phải từ 6-72 ký tự'; END IF;
  IF v_email IS NULL THEN RAISE EXCEPTION 'Email là bắt buộc để có thể lấy lại mật khẩu khi quên'; END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Email không hợp lệ'; END IF;
  IF EXISTS (SELECT 1 FROM public.accounts WHERE username = v_uname) THEN RAISE EXCEPTION 'Username đã tồn tại'; END IF;
  IF EXISTS (SELECT 1 FROM public.accounts WHERE lower(email) = v_email) THEN RAISE EXCEPTION 'Email đã được sử dụng'; END IF;

  IF v_uname = 'admin' THEN
    SELECT EXISTS(SELECT 1 FROM public.accounts WHERE role = 'admin') INTO v_admin_exists;
    IF NOT v_admin_exists THEN v_role := 'admin'; END IF;
  END IF;

  INSERT INTO public.accounts(username, real_name, email, password_hash, role, score, title, badges)
  VALUES (v_uname, v_rname, v_email, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), v_role, 0, '🥚 Tế Bào Sơ Cấp', '["🧫"]'::jsonb)
  RETURNING * INTO v_row;

  v_row.password_hash := NULL;
  RETURN v_row;
END;
$$;

-- 4. Cập nhật account với email (cho tài khoản cũ)
CREATE OR REPLACE FUNCTION public.set_account_email(p_user_id uuid, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_email text := NULLIF(lower(trim(coalesce(p_email,''))), '');
BEGIN
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Email không hợp lệ'; END IF;
  IF EXISTS (SELECT 1 FROM public.accounts WHERE lower(email) = v_email AND id <> p_user_id) THEN
    RAISE EXCEPTION 'Email đã được sử dụng bởi tài khoản khác';
  END IF;
  UPDATE public.accounts SET email = v_email, updated_at = now() WHERE id = p_user_id;
  RETURN true;
END;
$$;

-- 5. Tạo OTP, trả về OTP raw (để backend gửi email; nếu chưa có email service, client sẽ hiển thị dev)
CREATE OR REPLACE FUNCTION public.request_password_reset_otp(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email,'')));
  v_exists boolean;
  v_otp text;
BEGIN
  IF v_email = '' OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Email không hợp lệ'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.accounts WHERE lower(email) = v_email) INTO v_exists;
  IF NOT v_exists THEN RAISE EXCEPTION 'Không tìm thấy tài khoản với email này'; END IF;

  -- rate limit: tối đa 3 OTP / 10 phút cho 1 email
  IF (SELECT count(*) FROM public.password_reset_otps
      WHERE lower(email) = v_email AND created_at > now() - interval '10 minutes') >= 3 THEN
    RAISE EXCEPTION 'Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng đợi vài phút.';
  END IF;

  v_otp := lpad((floor(random()*1000000))::int::text, 6, '0');
  INSERT INTO public.password_reset_otps(email, otp_hash, expires_at)
  VALUES (v_email, extensions.crypt(v_otp, extensions.gen_salt('bf', 8)), now() + interval '10 minutes');
  RETURN v_otp;
END;
$$;

-- 6. Xác thực OTP và đổi mật khẩu
CREATE OR REPLACE FUNCTION public.verify_otp_and_reset(p_email text, p_otp text, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email,'')));
  v_rec record;
BEGIN
  IF char_length(p_new_password) < 6 OR char_length(p_new_password) > 72 THEN
    RAISE EXCEPTION 'Mật khẩu mới phải từ 6-72 ký tự';
  END IF;
  SELECT * INTO v_rec FROM public.password_reset_otps
    WHERE lower(email) = v_email AND used_at IS NULL AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'OTP đã hết hạn hoặc không tồn tại. Vui lòng gửi lại.'; END IF;
  IF v_rec.attempts >= 5 THEN RAISE EXCEPTION 'OTP đã sai quá nhiều lần. Vui lòng yêu cầu OTP mới.'; END IF;
  IF v_rec.otp_hash <> extensions.crypt(p_otp, v_rec.otp_hash) THEN
    UPDATE public.password_reset_otps SET attempts = attempts + 1 WHERE id = v_rec.id;
    RAISE EXCEPTION 'OTP không đúng';
  END IF;
  UPDATE public.accounts
    SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)), updated_at = now()
    WHERE lower(email) = v_email;
  UPDATE public.password_reset_otps SET used_at = now() WHERE id = v_rec.id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_account(text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_account_email(uuid,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_password_reset_otp(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_otp_and_reset(text,text,text) TO anon, authenticated;
