import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserRoleAndRedirectPath } from '@/hooks/useUserRoleRedirect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { z } from 'zod';
import logoOneBarber from '@/assets/logo.png';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('E-mail inválido').max(255, 'E-mail muito longo'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(72, 'Senha muito longa'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate input
    const result = signupSchema.safeParse({ fullName, email, password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      if (error.message.includes('User already registered')) {
        errorMessage = 'Este e-mail já está cadastrado.';
      }
      
      toast({
        title: 'Erro no cadastro',
        description: errorMessage,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Get the user after signup to determine the correct redirect
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Small delay to allow the trigger to create the user_role
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { redirectPath } = await getUserRoleAndRedirectPath(user.id);

      toast({
        title: 'Conta criada!',
        description: 'Você será redirecionado para o painel.',
      });

      navigate(redirectPath);
    } else {
      toast({
        title: 'Conta criada!',
        description: 'Você será redirecionado para o painel do cliente.',
      });
      
      // Default to client for new signups
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
          <div className="flex flex-col items-center mb-2">
            <img 
              src={logoOneBarber} 
              alt="OneBarber" 
              className="w-full max-w-[280px] h-auto"
            />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-4">Criar Conta</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-bold text-zinc-700 uppercase tracking-widest ml-1">
                  Nome Completo
                </Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white transition-all shadow-sm rounded-2xl font-medium"
                    disabled={loading}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-xs text-red-500 font-medium ml-1">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold text-zinc-700 uppercase tracking-widest ml-1">
                  E-mail
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white transition-all shadow-sm rounded-2xl font-medium"
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500 font-medium ml-1">{errors.email}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-bold text-zinc-700 uppercase tracking-widest ml-1">
                    Senha
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white transition-all shadow-sm rounded-2xl font-medium"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[10px] text-red-500 font-medium ml-1">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-bold text-zinc-700 uppercase tracking-widest ml-1">
                    Confirmar
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white transition-all shadow-sm rounded-2xl font-medium"
                      disabled={loading}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[10px] text-red-500 font-medium ml-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="premium-button-solid w-full h-11 text-sm shadow-lg mt-4"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Cadastrar'
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Já tem uma conta?{' '}
              <Link to="/login" className="font-bold text-slate-900 hover:underline">
                Acesse sua conta
              </Link>
            </p>
          </div>

          <div className="mt-12 text-center">
            <p className="text-slate-400 text-[10px] uppercase tracking-wide">
              © {new Date().getFullYear()} OneBarber. Todos os direitos reservados.
            </p>
          </div>
        </div>
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
