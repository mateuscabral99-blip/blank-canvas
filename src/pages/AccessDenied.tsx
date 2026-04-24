import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccessDeniedProps {
  onGoBack: () => void;
}

export default function AccessDenied({ onGoBack }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <ShieldOff className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
        Acesso Restrito
      </h1>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        Desculpe, você não tem permissão para acessar esta área administrativa.
        Caso precise de acesso, entre em contato com o supervisor do laboratório.
      </p>
      <Button onClick={onGoBack} variant="default" size="lg">
        Voltar para o Painel Principal
      </Button>
    </div>
  );
}
