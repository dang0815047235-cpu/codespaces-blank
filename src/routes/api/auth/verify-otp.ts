import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { email, otp, newPassword } = body;

    if (!email || !otp || !newPassword) {
      throw new Error('Email, OTP, and new password are required');
    }

    // Validate password strength
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Verify OTP
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('otp_code', otp)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Invalid or expired OTP');
    }

    // Get user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError || !users) {
      throw new Error('Failed to find user');
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      throw new Error('User not found');
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      throw new Error('Failed to update password');
    }

    // Mark OTP as used
    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    return {
      success: true,
      message: 'Password reset successfully',
    };
  } catch (error) {
    console.error('Error in verify-otp:', error);
    setResponseStatus(event, 400);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify OTP',
    };
  }
});
