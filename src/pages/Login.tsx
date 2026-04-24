import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogIn, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import alaresLogo from "@/assets/alares-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha email e senha.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message === "Invalid login credentials") {
          toast.error("Acesso negado. Este usuário não possui permissão para acessar o sistema. Entre em contato com o administrador.");
        } else {
          toast.error(error.message || "Erro na autenticação.");
        }
        return;
      }
      toast.success("Login realizado com sucesso!");
    } catch (error: any) {
      toast.error("Erro na autenticação. Entre em contato com o administrador.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, var(--brand-from) 0%, var(--brand-to) 100%)" }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white rounded-full opacity-[0.06] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#4B7BF5] rounded-full opacity-[0.08] blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1B4DDB] rounded-full opacity-[0.04] blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl shadow-lg mb-4 overflow-hidden">
            <img src={alaresLogo} alt="Alares Lab" className="h-16 w-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Alares Lab</h1>
          <p className="text-sm text-white/60 mt-1">Sistema de Gestão Laboratorial</p>
        </div>

        {/* Glassmorphism card */}
        <Card className="bg-white/12 backdrop-blur-xl border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg text-white">Acessar Sistema</CardTitle>
            <CardDescription className="text-white/55">
              Entre com suas credenciais corporativas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/80 text-xs font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 bg-white/10 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-white/40"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/80 text-xs font-medium">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 bg-white/10 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-white/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full gap-2 font-semibold shadow-lg border-0 transition-all duration-200"
                style={{
                  backgroundColor: "#1B4DDB",
                  color: "white",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2558E8")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1B4DDB")}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </>
                )}
              </Button>
            </form>
            <div className="mt-5 pt-4 border-t border-white/10 text-center">
              <p className="text-[11px] text-white/40">
                Acesso restrito a usuários autorizados pelo administrador.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-white/70 text-xs mt-6 font-medium tracking-wide">Criado por Mateus Mendes</p>
      </div>
    </div>
  );
}
