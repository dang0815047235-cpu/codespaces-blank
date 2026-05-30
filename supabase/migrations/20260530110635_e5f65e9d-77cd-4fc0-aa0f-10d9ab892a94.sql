
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add hash column
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS password_hash text;

-- Backfill: hash any existing plaintext passwords
UPDATE public.accounts
SET password_hash = crypt(password, gen_salt('bf', 10))
WHERE password_hash IS NULL AND password IS NOT NULL AND length(password) > 0;

-- Drop plaintext column
ALTER TABLE public.accounts DROP COLUMN IF EXISTS password;

-- Constraints
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_username_format CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  ADD CONSTRAINT accounts_realname_len CHECK (char_length(real_name) BETWEEN 1 AND 60);

-- Unique username (case-insensitive already lowercased by app)
CREATE UNIQUE INDEX IF NOT EXISTS accounts_username_unique ON public.accounts (username);

-- Secure register function (returns row without password_hash)
CREATE OR REPLACE FUNCTION public.register_account(
  p_username text,
  p_real_name text,
  p_password text
) RETURNS public.accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := 'user';
  v_uname text := lower(trim(p_username));
  v_rname text := trim(p_real_name);
  v_admin_exists boolean;
  v_row public.accounts;
BEGIN
  IF v_uname !~ '^[a-z0-9_]{3,24}$' THEN
    RAISE EXCEPTION 'Username phải 3-24 ký tự (chữ thường, số, gạch dưới)';
  END IF;
  IF char_length(v_rname) < 1 OR char_length(v_rname) > 60 THEN
    RAISE EXCEPTION 'Tên thật phải từ 1-60 ký tự';
  END IF;
  IF char_length(p_password) < 6 OR char_length(p_password) > 72 THEN
    RAISE EXCEPTION 'Mật khẩu phải từ 6-72 ký tự';
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounts WHERE username = v_uname) THEN
    RAISE EXCEPTION 'Username đã tồn tại';
  END IF;

  IF v_uname = 'admin' THEN
    SELECT EXISTS(SELECT 1 FROM public.accounts WHERE role = 'admin') INTO v_admin_exists;
    IF NOT v_admin_exists THEN v_role := 'admin'; END IF;
  END IF;

  INSERT INTO public.accounts(username, real_name, password_hash, role, score, title, badges)
  VALUES (v_uname, v_rname, crypt(p_password, gen_salt('bf', 10)), v_role, 0, '🥚 Tế Bào Sơ Cấp', '["🧫"]'::jsonb)
  RETURNING * INTO v_row;

  v_row.password_hash := NULL;
  RETURN v_row;
END;
$$;

-- Secure login function
CREATE OR REPLACE FUNCTION public.login_account(
  p_username text,
  p_password text
) RETURNS public.accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uname text := lower(trim(p_username));
  v_row public.accounts;
BEGIN
  SELECT * INTO v_row FROM public.accounts WHERE username = v_uname;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tài khoản hoặc mật khẩu không đúng';
  END IF;
  IF v_row.password_hash IS NULL OR v_row.password_hash <> crypt(p_password, v_row.password_hash) THEN
    RAISE EXCEPTION 'Tài khoản hoặc mật khẩu không đúng';
  END IF;
  v_row.password_hash := NULL;
  RETURN v_row;
END;
$$;

-- Change password function (verifies old password)
CREATE OR REPLACE FUNCTION public.change_password(
  p_user_id uuid,
  p_old_password text,
  p_new_password text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  IF char_length(p_new_password) < 6 OR char_length(p_new_password) > 72 THEN
    RAISE EXCEPTION 'Mật khẩu mới phải từ 6-72 ký tự';
  END IF;
  SELECT password_hash INTO v_hash FROM public.accounts WHERE id = p_user_id;
  IF v_hash IS NULL OR v_hash <> crypt(p_old_password, v_hash) THEN
    RAISE EXCEPTION 'Mật khẩu cũ không đúng';
  END IF;
  UPDATE public.accounts
    SET password_hash = crypt(p_new_password, gen_salt('bf', 10)), updated_at = now()
    WHERE id = p_user_id;
  RETURN true;
END;
$$;

-- Lock down direct password_hash access: revoke column from anon/authenticated
REVOKE ALL ON public.accounts FROM anon, authenticated;
GRANT SELECT (id, username, real_name, role, score, title, badges, created_at, updated_at)
  ON public.accounts TO anon, authenticated;
GRANT INSERT (username, real_name, role, score, title, badges)
  ON public.accounts TO authenticated;
GRANT UPDATE (real_name, score, title, badges, updated_at)
  ON public.accounts TO anon, authenticated;
GRANT DELETE ON public.accounts TO anon, authenticated;
GRANT ALL ON public.accounts TO service_role;

GRANT EXECUTE ON FUNCTION public.register_account(text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_account(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_password(uuid,text,text) TO anon, authenticated;
