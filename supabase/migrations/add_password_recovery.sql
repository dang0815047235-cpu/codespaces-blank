-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for quick OTP lookup
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email_otp 
  ON password_reset_tokens(email, otp_code);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at 
  ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used_at 
  ON password_reset_tokens(used_at);

-- Enable Row Level Security
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for password_reset_tokens (public access for reset flow)
CREATE POLICY "Allow public to verify OTP" 
  ON password_reset_tokens FOR SELECT 
  USING (true);

GRANT SELECT, INSERT, UPDATE ON password_reset_tokens TO anon, authenticated;
