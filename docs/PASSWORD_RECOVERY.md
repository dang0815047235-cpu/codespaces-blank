# Password Recovery with OTP Feature

## Overview

This feature implements a secure password recovery mechanism using One-Time Passwords (OTP) sent to user emails.

## Features

### 1. Email Collection During Registration
- Email is now **required** during account signup
- Users cannot create accounts without providing a valid email

### 2. OTP-Based Password Recovery
- Users who forget their password can initiate recovery
- System sends a 6-digit OTP to their registered email
- OTP is valid for 10 minutes
- After verifying OTP, users can set a new password

### 3. Email Update for Legacy Accounts
- Existing accounts without email are prompted to add one on successful login
- Dialog appears with option to skip or add email
- Email can be updated in account settings

## API Endpoints

### POST `/api/auth/send-otp`
Send OTP to user email for password recovery.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email"
}
```

### POST `/api/auth/verify-otp`
Verify OTP and reset password.

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### POST `/api/auth/update-email`
Update user email address.

**Request:**
```json
{
  "userId": "user-uuid",
  "email": "newemail@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email updated successfully"
}
```

## Components

### PasswordRecoveryForm
Main component for password recovery flow.
- **States:** email input → OTP verification → success
- **Features:** Email validation, OTP input, password strength validation, countdown timer
- **File:** `src/components/PasswordRecoveryForm.tsx`

### EmailPromptDialog
Dialog prompting users to add email to existing accounts.
- **Features:** Email validation, optional (can skip), success notification
- **File:** `src/components/EmailPromptDialog.tsx`

## Database Schema

### password_reset_tokens table
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

## Security Considerations

1. **OTP Expiration:** OTP tokens expire after 10 minutes
2. **One-time Use:** OTP can only be used once (marked as `used_at`)
3. **Rate Limiting:** Consider implementing rate limiting on send-otp endpoint
4. **Password Requirements:** Minimum 8 characters
5. **Email Verification:** Email should be verified before allowing password reset

## Implementation Checklist

- [x] Create API endpoints for OTP send/verify
- [x] Create PasswordRecoveryForm component
- [x] Create EmailPromptDialog component
- [x] Database migration for tokens table
- [ ] Email service integration (SMTP/Supabase email)
- [ ] Rate limiting middleware
- [ ] Test email delivery
- [ ] Add recovery page route
- [ ] Update registration form
- [ ] Update login flow to show email prompt

## Testing

### Manual Testing Steps

1. **Test OTP Send:**
   - Navigate to password recovery
   - Enter valid email
   - Check console/logs for OTP (since email not configured)

2. **Test OTP Verification:**
   - Submit OTP with new password
   - Verify password reset success

3. **Test Email Update:**
   - Log in with legacy account
   - Complete email update flow

## Future Enhancements

1. Email service integration
2. Rate limiting
3. Multiple OTP retry limit
4. SMS OTP as backup
5. Email verification before reset
6. Account recovery codes
7. Two-factor authentication
