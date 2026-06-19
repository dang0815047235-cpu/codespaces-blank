import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const recoverySchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export function PasswordRecoveryForm() {
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const emailForm = useForm({
    resolver: zodResolver(recoverySchema),
    defaultValues: { email: '' },
  });

  const resetForm = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: '', newPassword: '', confirmPassword: '' },
  });

  const onEmailSubmit = async (data: z.infer<typeof recoverySchema>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      setEmail(data.email);
      setStep('otp');
      setCountdown(300); // 5 minutes
      toast.success('OTP sent to your email');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onResetSubmit = async (data: z.infer<typeof resetSchema>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp: data.otp,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      setStep('success');
      toast.success('Password reset successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle countdown timer
  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Khôi phục mật khẩu</CardTitle>
        <CardDescription>Lấy lại quyền truy cập vào tài khoản của bạn</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'email' && (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Địa chỉ email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
              </Button>
            </form>
          </Form>
        )}

        {step === 'otp' && (
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Mã OTP đã được gửi tới <strong>{email}</strong>
              </div>

              <FormField
                control={resetForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã OTP (6 chữ số)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        inputMode="numeric"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={resetForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu mới</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Nhập mật khẩu mới"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={resetForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Xác nhận mật khẩu</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Xác nhận mật khẩu mới"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-xs text-muted-foreground">
                Mã OTP hết hạn trong: {formatCountdown(countdown)}
              </div>

              <Button type="submit" className="w-full" disabled={loading || countdown === 0}>
                {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('email');
                  emailForm.reset();
                  resetForm.reset();
                }}
              >
                Quay lại
              </Button>
            </form>
          </Form>
        )}

        {step === 'success' && (
          <div className="space-y-4 text-center">
            <div className="rounded-md bg-green-50 p-4 dark:bg-green-950">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                ✓ Mật khẩu đã được đặt lại thành công!
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Bạn có thể đăng nhập với mật khẩu mới của mình ngay bây giờ.
            </p>
            <Button className="w-full" onClick={() => window.location.href = '/login'}>
              Quay lại đăng nhập
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
