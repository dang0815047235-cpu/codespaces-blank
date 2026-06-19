# BIONOVA LEGACY - Setup Guide

## Prerequisites

- Node.js 18+
- Bun (package manager)
- Supabase account
- Resend account (for email service)

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd bionovalegacyy
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Setup Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the variables:

#### Supabase Setup

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Get your project URL and API keys from Settings → API
4. Fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY` (from Service Role API Key)

#### Email Service Setup (Resend)

1. Go to [Resend](https://resend.com)
2. Create account and get API key
3. Add your domain (or use provided domain)
4. Fill in:
   - `VITE_RESEND_API_KEY`
   - `RESEND_API_KEY`

### 4. Database Migration

Run the migration in Supabase SQL Editor:

```sql
-- Copy contents from supabase/migrations/add_password_recovery.sql
```

### 5. Run Development Server

```bash
bun run dev
```

Server will start at `http://localhost:5173`

## Feature: Password Recovery with OTP

### Workflow

1. **User forgets password**
   - Navigate to `/forgot-password`
   - Enter email address
   - System sends 6-digit OTP via email

2. **User verifies OTP**
   - Enter OTP from email
   - Set new password
   - System validates and updates password

3. **Existing accounts**
   - After login, if email missing, user is prompted to add it
   - Can skip or complete

### Testing

**Without Email Service:**
OTP will be logged in console:
```
[DEV] OTP for user@example.com: 123456
```

**With Email Service:**
OTP will be sent via email

## Build for Production

```bash
bun run build
```

## Troubleshooting

### Email not sending

1. Check Resend API key is correct
2. Verify domain is verified in Resend
3. Check spam folder
4. Look at server logs for errors

### Supabase errors

1. Verify connection string
2. Check service role key has admin permissions
3. Ensure tables are created via migrations

### Login issues

1. Clear browser cache
2. Check user exists in Supabase auth.users
3. Verify password is correct
