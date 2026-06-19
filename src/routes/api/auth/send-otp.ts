import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const resendApiKey = process.env.RESEND_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Resend email service
async function sendOTPEmail(email: string, otp: string): Promise<void> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'noreply@bionovalegacy.com',
        to: email,
        subject: 'Mã xác minh khôi phục mật khẩu - BIONOVA LEGACY',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
                .header { text-align: center; border-bottom: 2px solid #0066cc; padding-bottom: 20px; margin-bottom: 20px; }
                .header h1 { color: #0066cc; margin: 0; }
                .content { color: #333; line-height: 1.6; }
                .otp-box { background-color: #f9f9f9; border: 2px solid #0066cc; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                .otp-code { font-size: 32px; font-weight: bold; color: #0066cc; letter-spacing: 5px; font-family: monospace; }
                .expiry { color: #666; font-size: 12px; margin-top: 10px; }
                .footer { border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px; color: #666; font-size: 12px; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>BIONOVA LEGACY</h1>
                  <p>Hệ sinh thái học tập sinh học</p>
                </div>
                <div class="content">
                  <p>Xin chào,</p>
                  <p>Bạn đã yêu cầu khôi phục mật khẩu cho tài khoản của mình. Vui lòng sử dụng mã xác minh dưới đây:</p>
                  <div class="otp-box">
                    <div class="otp-code">${otp}</div>
                    <div class="expiry">Mã này sẽ hết hạn trong 10 phút</div>
                  </div>
                  <p><strong>⚠️ Lưu ý:</strong> Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.</p>
                  <p>Không chia sẻ mã này với bất kỳ ai.</p>
                </div>
                <div class="footer">
                  <p>© 2024 BIONOVA LEGACY. Mọi quyền được bảo lưu.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send email');
    }
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { email } = body;

    if (!email) {
      throw new Error('Email is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Check if user exists
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError || !users) {
      throw new Error('Failed to verify email');
    }

    const userExists = users.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!userExists) {
      throw new Error('Email not found in system');
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP in database
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert([
        {
          email: email.toLowerCase(),
          otp_code: otp,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        }
      ]);

    if (insertError) {
      throw new Error('Failed to store OTP');
    }

    // Send email if API key is available
    if (resendApiKey) {
      await sendOTPEmail(email, otp);
    } else {
      // For development: log OTP to console
      console.log(`[DEV] OTP for ${email}: ${otp}`);
    }

    return {
      success: true,
      message: 'OTP sent to your email',
    };
  } catch (error) {
    console.error('Error in send-otp:', error);
    setResponseStatus(event, 400);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send OTP',
    };
  }
});
