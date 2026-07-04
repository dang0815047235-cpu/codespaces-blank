
DROP FUNCTION IF EXISTS public.request_password_reset_otp(text);
DROP FUNCTION IF EXISTS public.verify_otp_and_reset(text, text, text);

CREATE OR REPLACE FUNCTION public.reset_password_by_verified_email(p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email text;
  v_exists boolean;
BEGIN
  v_email := lower(trim(coalesce((auth.jwt() ->> 'email'), '')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'Chưa xác thực email. Vui lòng xác minh OTP trước.';
  END IF;
  IF char_length(p_new_password) < 6 OR char_length(p_new_password) > 72 THEN
    RAISE EXCEPTION 'Mật khẩu mới phải từ 6-72 ký tự';
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.accounts WHERE lower(email) = v_email) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Không tìm thấy tài khoản với email này';
  END IF;
  UPDATE public.accounts
     SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
         updated_at = now()
   WHERE lower(email) = v_email;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_password_by_verified_email(text) TO authenticated;
