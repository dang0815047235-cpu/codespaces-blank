import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via email
async function sendOTPEmail(email: string, otp: string): Promise<void> {
  try {
    // Store OTP in database with expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const { error } = await supabase
      .from('password_reset_tokens')
      .insert([
        {
          email: email.toLowerCase(),
          otp_code: otp,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) throw error;

    // TODO: Send email using Supabase Auth email service or external email provider
    console.log(`OTP ${otp} sent to ${email}`);
  } catch (error) {
    console.error('Error sending OTP:', error);
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

    // Generate and send OTP
    const otp = generateOTP();
    await sendOTPEmail(email, otp);

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
