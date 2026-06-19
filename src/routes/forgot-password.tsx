import { createFileRoute } from '@tanstack/react-router';
import { PasswordRecoveryForm } from '@/components/PasswordRecoveryForm';

export const Route = createFileRoute('/forgot-password')({ 
  component: ForgotPassword,
});

function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">BIONOVA LEGACY</h1>
          <p className="text-slate-400">Hệ sinh thái học tập sinh học</p>
        </div>
        <PasswordRecoveryForm />
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Nhớ mật khẩu rồi?{' '}
            <a href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
              Quay lại đăng nhập
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
