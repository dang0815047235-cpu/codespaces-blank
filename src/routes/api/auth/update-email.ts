import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { userId, email } = body;

    if (!userId || !email) {
      throw new Error('User ID and email are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Update user email in auth.users
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { email: email.toLowerCase() }
    );

    if (updateError) {
      throw new Error('Failed to update email');
    }

    return {
      success: true,
      message: 'Email updated successfully',
    };
  } catch (error) {
    console.error('Error in update-email:', error);
    setResponseStatus(event, 400);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update email',
    };
  }
});
