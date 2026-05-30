CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Cập nhật hàm Đăng ký (Register)
CREATE OR REPLACE FUNCTION public.register_account(
  p_username text,
  p_real_name text,
  p_password text
) RETURNS public.accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions 
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

-- Cập nhật hàm Đăng nhập (Login)
CREATE OR REPLACE FUNCTION public.login_account(
  p_username text,
  p_password text
) RETURNS public.accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

-- Cập nhật hàm Đổi mật khẩu (Change Password)
CREATE OR REPLACE FUNCTION public.change_password(
  p_user_id uuid,
  p_old_password text,
  p_new_password text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

-- Phân lại quyền thực thi hàm cho các tài khoản API
GRANT EXECUTE ON FUNCTION public.register_account(text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_account(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_password(uuid,text,text) TO anon, authenticated;

-- Ép làm mới hệ thống
NOTIFY pgrst, 'reload schema';
