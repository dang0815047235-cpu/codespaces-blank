import { Resend } from 'resend';

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

interface SendOTPEmailParams {
  email: string;
  otp: string;
  expiryMinutes?: number;
}

interface SendWelcomeEmailParams {
  email: string;
  fullName?: string;
}

export async function sendOTPEmail({
  email,
  otp,
  expiryMinutes = 10,
}: SendOTPEmailParams) {
  try {
    const result = await resend.emails.send({
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
                  <div class="expiry">Mã này sẽ hết hạn trong ${expiryMinutes} phút</div>
                </div>
                <p><strong>⚠️ Lưu ý:</strong> Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.</p>
                <p>Không chia sẻ mã này với bất kỳ ai.</p>
              </div>
              <div class="footer">
                <p>© 2024 BIONOVA LEGACY. Mọi quyền được bảo lưu.</p>
                <p>Nếu bạn có câu hỏi, vui lòng liên hệ với chúng tôi.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
}

export async function sendWelcomeEmail({
  email,
  fullName = 'Bạn',
}: SendWelcomeEmailParams) {
  try {
    const result = await resend.emails.send({
      from: 'noreply@bionovalegacy.com',
      to: email,
      subject: 'Chào mừng bạn đến với BIONOVA LEGACY',
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
              .cta-button { display: inline-block; background-color: #0066cc; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
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
                <p>Xin chào ${fullName},</p>
                <p>Chúc mừng bạn đã tạo tài khoản thành công trên BIONOVA LEGACY!</p>
                <p>Đây là nền tảng học tập toàn diện về sinh học cho học sinh THPT, giúp bạn:</p>
                <ul>
                  <li>Nắm vững kiến thức sinh học cơ bản</li>
                  <li>Luyện tập với hàng trăm bài tập chất lượng</li>
                  <li>Theo dõi tiến độ học tập của bạn</li>
                  <li>Cải thiện kết quả học tập</li>
                </ul>
                <p><a href="https://bionovalegacy.com" class="cta-button">Bắt đầu học ngay</a></p>
              </div>
              <div class="footer">
                <p>© 2024 BIONOVA LEGACY. Mọi quyền được bảo lưu.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
}
