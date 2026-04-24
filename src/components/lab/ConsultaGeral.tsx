import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search, LogIn, ClipboardCheck, LogOut as LogOutIcon,
  AlertCircle, Loader2, Calendar, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  stage: "ENTRADA" | "TESTE" | "SAÍDA";
  date: string;
  time: string;
  detail?: string;
  raw: string;
}

interface SNResult {
  sn: string;
  found: boolean;
  events: TimelineEvent[];
  nome?: string;
  codigo?: string;
  origem?: string;
}

const stageMeta: Record<TimelineEvent["stage"], { icon: React.ReactNode; color: string; bg: string; ring: string }> = {
  ENTRADA: {
    icon: <LogIn className="h-4 w-4" />,
    color: "text-sky-600 dark:text-sky-300",
    bg: "bg-sky-500/15",
    ring: "ring-sky-500/30",
  },
  TESTE: {
    icon: <ClipboardCheck className="h-4 w-4" />,
    color: "text-amber-600 dark:text-amber-300",
    bg: "bg-amber-500/15",
    ring: "ring-amber-500/30",
  },
  "SAÍDA": {
    icon: <LogOutIcon className="h-4 w-4" />,
    color: "text-emerald-600 dark:text-emerald-300",
    bg: "bg-emerald-500/15",
    ring: "ring-emerald-500/30",
  },
};

function formatDateTime(iso: string): { date: string; time: string } {
  if (!iso) return { date: "—", time: "—" };
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { date: iso, time: "—" };
    
    // Force UTC-3 timezone for display as requested
    // Note: In a real browser environment, toLocaleString uses the client's timezone.
    // To strictly force America/Sao_Paulo (UTC-3):
    return {
      date: d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      time: d.toLocaleTimeString("pt-BR", { 
        hour: "2-digit", 
        minute: "2-digit",
        timeZone: "America/Sao_Paulo"
      }),
    };
  } catch {
    return { date: iso, time: "—" };
  }
}

function parseSNs(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

export function ConsultaGeral() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SNResult[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const sns = parseSNs(input);
    if (sns.length === 0) {
      toast.error("Informe pelo menos um Serial Number.");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const [labRes, testRes, repairRes] = await Promise.all([
        supabase.from("equipamentos").select("serial_number,nome,codigo,origem,created_at,data_entrada").in("serial_number", sns),
        supabase.from("test_results").select("sn,resultado,destino_reparo,data_teste,created_at,nome,codigo").in("sn", sns),
        supabase.from("repair_returns").select("sn,encaminhamento,resultado_amostragem,created_at").in("sn", sns),
      ]);

      if (labRes.error) throw labRes.error;
      if (testRes.error) throw testRes.error;
      if (repairRes.error) throw repairRes.error;

      const compiled: SNResult[] = sns.map((sn) => {
        const events: TimelineEvent[] = [];
        let nome: string | undefined;
        let codigo: string | undefined;
        let origem: string | undefined;

        // Stage: ENTRADA
        (labRes.data || [])
          .filter((r: any) => r.serial_number === sn)
          .forEach((r: any) => {
            nome = nome || r.nome;
            codigo = codigo || r.codigo;
            // Prefer data_entrada, fallback to created_at
            const iso = r.data_entrada || r.created_at;
            const { date, time } = formatDateTime(iso);
            events.push({ 
              stage: "ENTRADA", 
              date, 
              time, 
              raw: iso, 
              detail: "Item registrado no laboratório" 
            });
          });

        // Stage: TESTE
        (testRes.data || [])
          .filter((r: any) => r.sn === sn)
          .forEach((r: any) => {
            nome = nome || r.nome;
            codigo = codigo || r.codigo;
            // Prefer data_teste, fallback to created_at
            const iso = r.data_teste || r.created_at;
            const { date, time } = formatDateTime(iso);
            events.push({
              stage: "TESTE",
              date,
              time,
              raw: iso,
              detail: r.resultado_teste ? `Resultado: ${r.resultado_teste}` : undefined,
            });
          });

        // Stage: SAÍDA
        (repairRes.data || [])
          .filter((r: any) => r.sn === sn)
          .forEach((r: any) => {
            // Using created_at for SAÍDA as it's the primary timestamp for this table
            const iso = r.created_at;
            const { date, time } = formatDateTime(iso);
            events.push({
              stage: "SAÍDA",
              date,
              time,
              raw: iso,
              detail: r.encaminhamento || r.resultado_amostragem || "Retorno de reparo",
            });
          });

        // Sort events chronologically (Oldest to Newest)
        events.sort((a, b) => new Date(a.raw).getTime() - new Date(b.raw).getTime());

        return { sn, found: events.length > 0, events, nome, codigo };
      });

      setResults(compiled);
      const foundCount = compiled.filter((r) => r.found).length;
      toast.success(`${foundCount} de ${sns.length} SN(s) encontrados.`);
    } catch (e: any) {
      toast.error(`Erro na consulta: ${e?.message || "desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search panel */}
      <Card className="shadow-md border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-primary" />
            Consulta Geral por Serial Number
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Digite um ou mais Serial Numbers (um por linha ou separados por vírgula)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            className="font-mono text-sm resize-y"
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {parseSNs(input).length > 0
                ? `${parseSNs(input).length} SN(s) prontos para consulta`
                : "Suporta busca individual ou em lote"}
            </p>
            <Button
              onClick={handleSearch}
              disabled={loading || parseSNs(input).length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Consultar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {searched && !loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((r) => (
            <Card
              key={r.sn}
              className={cn(
                "shadow-md border-border/60 transition-all hover:shadow-lg",
                !r.found && "border-destructive/30 bg-destructive/5"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-mono truncate">{r.sn}</CardTitle>
                    {r.found && (r.nome || r.codigo) && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {r.codigo && <span className="font-mono">{r.codigo}</span>}
                        {r.codigo && r.nome && " · "}
                        {r.nome}
                      </p>
                    )}
                  </div>
                  {r.found ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 shrink-0">
                      {r.events.length} evento{r.events.length > 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 shrink-0">
                      Não encontrado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {r.found ? (
                  <ol className="relative border-l border-border/60 ml-3 space-y-4">
                    {r.events.map((ev, idx) => {
                      const meta = stageMeta[ev.stage];
                      return (
                        <li key={idx} className="ml-5">
                          <span
                            className={cn(
                              "absolute -left-[13px] flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-background",
                              meta.bg,
                              meta.color
                            )}
                          >
                            {meta.icon}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={cn("text-xs font-bold uppercase tracking-wider", meta.color)}>
                              {ev.stage}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {ev.date} às {ev.time}
                            </span>
                          </div>
                          {ev.detail && (
                            <p className="text-xs text-foreground/80 mt-1">{ev.detail}</p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Sem histórico para este Serial Number
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <Card className="shadow-md border-border/60">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum resultado para exibir.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
