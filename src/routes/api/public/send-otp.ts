import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';

export const Route = createFileRoute('/api/public/send-otp')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { email } = await request.json() as { email?: string };
          const clean = String(email || '').trim().toLowerCase();
          if (!clean || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
            return new Response(JSON.stringify({ error: 'Email không hợp lệ' }), { status: 400 });
          }

          const url = process.env.SUPABASE_URL!;
          const pub = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const supa = createClient(url, pub, { auth: { persistSession: false, autoRefreshToken: false } });
          const { data: otp, error } = await supa.rpc('request_password_reset_otp', { p_email: clean });
          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

          const resendKey = process.env.RESEND_API_KEY;
          if (!resendKey) {
            return new Response(JSON.stringify({ ok: true, devOtp: String(otp), warning: 'RESEND_API_KEY missing' }), { status: 200 });
          }

          const html = `
            <div style="font-family:Inter,Arial,sans-serif;background:#0f172a;padding:32px;color:#e2e8f0">
              <div style="max-width:480px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:16px;padding:28px">
                <h1 style="color:#2dd4bf;font-size:20px;margin:0 0 8px">BIONOVA LEGACY</h1>
                <p style="color:#94a3b8;font-size:13px;margin:0 0 20px">Mã OTP đặt lại mật khẩu của bạn</p>
                <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#f59e0b;background:#0b1220;border:1px dashed #334155;border-radius:12px;padding:18px;text-align:center">${otp}</div>
                <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.</p>
              </div>
            </div>`;

          const sendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: 'BIONOVA LEGACY <onboarding@resend.dev>',
              to: [clean],
              subject: `Mã OTP đặt lại mật khẩu: ${otp}`,
              html,
            }),
          });
          if (!sendRes.ok) {
            const body = await sendRes.text();
            let friendly = 'Email service chưa được cấu hình domain. Dùng mã bên dưới để đặt lại mật khẩu.';
            try {
              const j = JSON.parse(body);
              if (j?.statusCode === 403 && String(j?.message || '').includes('testing emails')) {
                friendly = 'Hệ thống email đang ở chế độ thử nghiệm (chưa verify domain). Dùng mã OTP bên dưới để đặt lại mật khẩu ngay.';
              } else if (j?.message) {
                friendly = 'Không gửi được email: ' + j.message;
              }
            } catch {}
            return new Response(JSON.stringify({ ok: true, devOtp: String(otp), warning: friendly }), { status: 200 });
          }
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message || 'Server error' }), { status: 500 });
        }
      },
    },
  },
});