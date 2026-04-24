import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ScanBarcode, AlertTriangle, RefreshCw } from "lucide-react";
import alaresLogo from "@/assets/alares-logo.png";
import { cn } from "@/lib/utils";

interface WelcomeModalProps {
  userId: string;
  userName?: string;
}

const STORAGE_KEY = "alares_lab_welcome_seen";

const steps = [
  {
    icon: <ScanBarcode className="h-6 w-6" />,
    title: "Registro Preciso",
    description: "Sempre bipe o Serial Number corretamente para evitar duplicidade.",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    iconColor: "text-blue-400",
  },
  {
    icon: <AlertTriangle className="h-6 w-6" />,
    title: "Atenção à Reincidência",
    description: "Equipamentos que voltam em menos de 60 dias exigem laudo detalhado e fotos.",
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    iconColor: "text-amber-400",
  },
  {
    icon: <RefreshCw className="h-6 w-6" />,
    title: "Fluxo em Tempo Real",
    description: "Mantenha o status atualizado no Fluxo de Trabalho para facilitar o controle de estoque.",
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
];

export function WelcomeModal({ userId, userName }: WelcomeModalProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    try {
      const seenUsers: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!seenUsers.includes(userId)) {
        // small delay so page renders first
        const timer = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      setOpen(true);
    }
  }, [userId]);

  const handleClose = () => {
    setClosing(true);
    setShowConfetti(true);

    // Persist that the user has seen the modal
    try {
      const seenUsers: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!seenUsers.includes(userId)) {
        seenUsers.push(userId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seenUsers));
      }
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([userId]));
    }

    setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setShowConfetti(false);
    }, 1200);
  };
  const displayName = userName || "Usuário";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className={cn(
          "sm:max-w-lg p-0 gap-0 border-0 overflow-hidden",
          "bg-gradient-to-b from-[hsl(226,27%,14%)] to-[hsl(226,30%,10%)] text-white",
          "shadow-2xl shadow-black/40"
        )}
      >
        {/* Confetti overlay */}
        {showConfetti && (
          <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="absolute animate-[confetti_1.2s_ease-out_forwards] rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 30}%`,
                  width: `${6 + Math.random() * 8}px`,
                  height: `${6 + Math.random() * 8}px`,
                  backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"][i % 6],
                  animationDelay: `${Math.random() * 0.4}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Header */}
        <div className="relative px-6 pt-8 pb-5 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(225,78%,55%)]/15 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div
              className="h-16 w-16 rounded-full mx-auto mb-6 flex items-center justify-center bg-white/10 animate-[slow-pulse_3s_ease-in-out_infinite]"
              style={{
                boxShadow: "0 0 15px rgba(59,130,246,0.5)",
              }}
            >
              <img
                src={alaresLogo}
                alt="Alares Lab"
                className="h-12 w-12 object-contain drop-shadow-lg"
              />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Bem-vindo ao Alares Lab,{" "}
              <span style={{ color: "hsl(210, 90%, 72%)" }}>{displayName}</span>!
            </h2>
            <p className="text-sm text-white/50 mt-1.5 max-w-sm mx-auto leading-relaxed">
              Sua plataforma centralizada para gestão de equipamentos e controle de qualidade.
            </p>
          </div>
        </div>

        {/* Step cards */}
        <div className="px-6 pb-2 space-y-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-start gap-3.5 p-3.5 rounded-xl border bg-gradient-to-r transition-all",
                "animate-[fade-in_0.4s_ease-out]",
                step.color
              )}
              style={{ animationDelay: `${0.15 + idx * 0.12}s`, animationFillMode: "both" }}
            >
              <div className={cn("shrink-0 mt-0.5", step.iconColor)}>{step.icon}</div>
              <div>
                <p className="font-semibold text-sm text-white">{step.title}</p>
                <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pt-4 pb-6">
          <Button
            onClick={handleClose}
            disabled={closing}
            className="w-full gap-2 font-semibold text-sm h-11 rounded-xl shadow-lg transition-all duration-200 border-0"
            style={{ backgroundColor: "hsl(225, 78%, 55%)", color: "white" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(225, 78%, 62%)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(225, 78%, 55%)")}
          >
            {closing ? (
              <CheckCircle2 className="h-5 w-5 animate-scale-in" />
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Entendi, vamos começar!
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
