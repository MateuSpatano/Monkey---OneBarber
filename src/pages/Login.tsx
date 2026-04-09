import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserRoleAndRedirectPath } from '@/hooks/useUserRoleRedirect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import logoOneBarber from '@/assets/logo.png';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido').max(255, 'E-mail muito longo'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(72, 'Senha muito longa'),
});

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      let errorMessage = 'Erro ao fazer login. Tente novamente.';
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'E-mail ou senha incorretos.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Por favor, confirme seu e-mail antes de fazer login.';
      }
      
      toast({
        title: 'Erro no login',
        description: errorMessage,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Check user role to determine redirect
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if user is inactive
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.status === 'inactive') {
        await supabase.auth.signOut();
        toast({
          title: 'Conta desativada',
          description: 'Sua conta foi desativada. Entre em contato com o administrador.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { redirectPath } = await getUserRoleAndRedirectPath(user.id);

      toast({
        title: 'Login realizado!',
        description: 'Bem-vindo de volta.',
      });

      navigate(redirectPath);
    } else {
      navigate('/client');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex bg-white overflow-hidden">
      {/* Left Side - Form Area */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center p-8 sm:p-12 lg:p-16 bg-white overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Logo Area */}
          <div className="flex flex-col items-center mb-4">
            <img 
              src={logoOneBarber} 
              alt="OneBarber" 
              className="w-full max-w-[280px] h-auto"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold text-zinc-700 uppercase tracking-widest ml-1">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12 bg-zinc-50 border-zinc-200 focus:bg-white transition-all shadow-sm rounded-2xl font-medium"
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 font-medium ml-1">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-bold text-zinc-700 uppercase tracking-widest ml-1">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 h-12 bg-zinc-50 border-zinc-200 focus:bg-white transition-all shadow-sm rounded-2xl font-medium"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 font-medium ml-1">{errors.password}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="rounded-lg border-zinc-300"
                />
                <Label 
                  htmlFor="remember" 
                  className="text-sm text-zinc-500 cursor-pointer select-none font-medium"
                >
                  Lembrar-me
                </Label>
              </div>
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                className="text-sm font-bold text-zinc-900 hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>

            <Button
              type="submit"
              className="premium-button-solid w-full h-12 text-base shadow-xl"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Não tem uma conta?{' '}
              <Link to="/signup" className="font-bold text-slate-900 hover:underline">
                Criar conta
              </Link>
            </p>
          </div>

          <div className="mt-12 text-center">
            <p className="text-slate-400 text-xs">
              © {new Date().getFullYear()} OneBarber. Todos os direitos reservados.
            </p>
          </div>
        </div>

        <ForgotPasswordModal open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
      </div>

      {/* Right Side - Image Hero */}
      <div className="hidden lg:block lg:w-[55%] relative h-screen bg-white">
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat rounded-l-[32px] overflow-hidden"
          style={{ backgroundImage: 'url(/barber-login-bg.jpg)' }}
          aria-label="Barber Shop"
        >
          {/* Dark Overlay Filter */}
          <div className="absolute inset-0 bg-slate-950/40" />
        </div>
      </div>
    </div>
  );
}
