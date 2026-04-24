import { useEffect, useMemo, useRef, useState } from "react";
import { LabItem } from "@/types/LabItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  FileText,
  Paperclip,
  Trash2,
  Image,
  CheckCircle2,
  TriangleAlert,
  ShieldAlert,
  BarChart3,
  Clock,
  Send,
} from "lucide-react";
import { useLaudos } from "@/hooks/useLaudos";
import { useTestResults, TestResult } from "@/hooks/useTestResults";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  items: LabItem[];
  isAdmin?: boolean;
}

interface LaudoItem {
  sn: string;
  nome: string;
  codigo: string;
  primeiraEntrada: string;
  retorno: string;
  diasEntre: number;
  entradas: number;
}

const CAUSA_OPTIONS = [
  { value: "falha_teste", label: "Falha de Teste" },
  { value: "defeito_intermitente", label: "Defeito Intermitente" },
  { value: "dano_transporte", label: "Dano no Transporte/Instalação" },
  { value: "nova_falha", label: "Nova Falha" },
  { value: "erro_diagnostico", label: "Erro de Diagnóstico em Campo" },
  { value: "equipamento_operacional", label: "Equipamento Operacional" },
];

function SignedImage({ getSignedUrl, filePath, alt }: { getSignedUrl: (p: string) => Promise<string>; filePath: string; alt: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    getSignedUrl(filePath).then(setSrc);
  }, [filePath, getSignedUrl]);
  return src ? (
    <img src={src} alt={alt} className="w-full h-40 object-cover rounded-md border" />
  ) : (
    <div className="w-full h-40 bg-muted rounded-md border flex items-center justify-center text-xs text-muted-foreground">Carregando...</div>
  );
}

function getLastTestForSn(sn: string, testResults: TestResult[]) {
  const snUpper = sn.trim().toUpperCase();
  const matching = testResults
    .filter((t) => t.sn?.trim().toUpperCase() === snUpper && t.resultado === "Equipamento aprovado")
    .sort((a, b) => new Date(b.data_teste).getTime() - new Date(a.data_teste).getTime());
  return matching[0] || null;
}

export function LaudoAlerts({ items, isAdmin }: Props) {
  const { getLaudoForSn, getAttachmentsForLaudo, upsertLaudo, closeLaudo, uploadAttachment, deleteAttachment, getSignedUrl } = useLaudos();
  const { results: testResults } = useTestResults();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [closingDestino, setClosingDestino] = useState<Record<string, "reparo" | "obsoleto" | "aprovado">>({});

  const laudos = useMemo(() => {
    const snMap = new Map<string, LabItem[]>();
    for (const item of items) {
      if (!item.sn?.trim()) continue;
      const key = item.sn.trim().toUpperCase();
      if (!snMap.has(key)) snMap.set(key, []);
      snMap.get(key)!.push(item);
    }

    const result: LaudoItem[] = [];
    for (const [sn, entries] of snMap) {
      if (entries.length < 2) continue;
      const sorted = [...entries].sort(
        (a, b) => new Date(a.data_entrada).getTime() - new Date(b.data_entrada).getTime()
      );
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].data_entrada);
        const curr = new Date(sorted[i].data_entrada);
        const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 60 && diffDays >= 0) {
          result.push({
            sn,
            nome: sorted[i].nome,
            codigo: sorted[i].codigo,
            primeiraEntrada: sorted[i - 1].data_entrada,
            retorno: sorted[i].data_entrada,
            diasEntre: diffDays,
            entradas: sorted.length,
          });
          break;
        }
      }
    }
    return result.sort((a, b) => a.diasEntre - b.diasEntre);
  }, [items]);

  const concluidos = laudos.filter((l) => getLaudoForSn(l.sn)?.concluido).length;

  // Taxa de reincidência: reincidentes / total de SNs únicos aprovados no mês
  const taxaReincidencia = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const approvedThisMonth = new Set(
      testResults
        .filter((t) => t.resultado === "Equipamento aprovado" && t.data_teste >= monthStart)
        .map((t) => t.sn?.trim().toUpperCase())
        .filter(Boolean)
    );
    if (approvedThisMonth.size === 0) return 0;
    const reincidentSns = new Set(laudos.map((l) => l.sn));
    let overlap = 0;
    for (const sn of reincidentSns) {
      if (approvedThisMonth.has(sn)) overlap++;
    }
    return Math.round((overlap / approvedThisMonth.size) * 100);
  }, [laudos, testResults]);

  const handleToggleConcluido = (sn: string) => {
    const existing = getLaudoForSn(sn);
    upsertLaudo.mutate({ sn, concluido: !existing?.concluido });
  };

  const handleCausaChange = (sn: string, causa: string) => {
    upsertLaudo.mutate({ sn, causa_reincidencia: causa });
  };

  const handleCloseLaudo = (sn: string) => {
    const laudoData = getLaudoForSn(sn);
    const causa = laudoData?.causa_reincidencia || "falha_teste";
    const destino = closingDestino[sn] || "reparo";
    closeLaudo.mutate({ sn, causa_reincidencia: causa, destino: destino as "reparo" | "obsoleto" | "aprovado" });
  };

  const handleFileUpload = (sn: string, files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      uploadAttachment.mutate({ sn, file });
    });
  };

  const kpis = [
    { label: "SNs para Laudo", value: laudos.length, icon: ShieldAlert, color: "text-yellow-600", border: "border-yellow-500/30" },
    { label: "Laudos Concluídos", value: concluidos, icon: CheckCircle2, color: "text-green-600", border: "border-green-500/30" },
    { label: "Menor intervalo", value: laudos.length > 0 ? `${laudos[0].diasEntre}d` : "—", icon: Clock, color: "text-primary", border: "border-primary/30" },
    {
      label: "Taxa de Reincidência",
      value: `${taxaReincidencia}%`,
      icon: BarChart3,
      color: taxaReincidencia > 10 ? "text-destructive" : "text-green-600",
      border: taxaReincidencia > 10 ? "border-destructive/30" : "border-green-500/30",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Laudo — Equipamentos Reincidentes
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Seriais que retornaram em até 60 dias. Identifique a causa, registre a auditoria e encaminhe.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={`border ${kpi.border}`}>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground leading-none mb-0.5">{kpi.label}</p>
                <p className="text-2xl font-bold leading-none">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Equipamentos que retornaram em ≤ 60 dias
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">✓</TableHead>
                <TableHead>SN</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>1ª Entrada</TableHead>
                <TableHead>Retorno</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead>Último Teste</TableHead>
                <TableHead>Causa</TableHead>
                <TableHead>Anexos</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laudos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-12">
                    ✅ Nenhum equipamento reincidente em até 60 dias.
                  </TableCell>
                </TableRow>
              ) : (
                laudos.map((l) => {
                  const laudoData = getLaudoForSn(l.sn);
                  const laudoAttachments = laudoData ? getAttachmentsForLaudo(laudoData.id) : [];
                  const lastTest = getLastTestForSn(l.sn, testResults);
                  const causa = laudoData?.causa_reincidencia || "";
                  const isCritical = l.diasEntre < 7;

                  return (
                    <TableRow
                      key={l.sn}
                      className={`${laudoData?.concluido ? "opacity-60 bg-green-500/5" : ""} ${isCritical && !laudoData?.concluido ? "bg-red-500/5" : ""}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={laudoData?.concluido ?? false}
                          onCheckedChange={() => handleToggleConcluido(l.sn)}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        <div className="flex items-center gap-1">
                          {isCritical && !laudoData?.concluido && (
                            <TriangleAlert className="h-4 w-4 text-destructive shrink-0" />
                          )}
                          {laudoData?.concluido && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
                          <span>{l.sn}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{l.codigo}</TableCell>
                      <TableCell className="text-xs">{l.nome}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{l.primeiraEntrada}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{l.retorno}</TableCell>
                      <TableCell>
                        <Badge
                          variant={l.diasEntre < 7 ? "destructive" : l.diasEntre <= 14 ? "default" : "secondary"}
                        >
                          {l.diasEntre}d
                        </Badge>
                      </TableCell>
                      {/* Último Teste */}
                      <TableCell className="text-xs">
                        {lastTest ? (
                          <div className="leading-tight">
                            <p className="font-medium">{lastTest.testado_por || "—"}</p>
                            <p className="text-muted-foreground text-[10px]">{lastTest.data_teste}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {/* Causa */}
                      <TableCell>
                        <Select
                          value={causa || undefined}
                          onValueChange={(v) => handleCausaChange(l.sn, v)}
                          disabled={laudoData?.concluido}
                        >
                          <SelectTrigger className="h-7 w-[150px] text-[11px]">
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CAUSA_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* Anexos */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            ref={(el) => { fileInputRefs.current[l.sn] = el; }}
                            onChange={(e) => handleFileUpload(l.sn, e.target.files)}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => fileInputRefs.current[l.sn]?.click()}
                          >
                            <Paperclip className="h-3 w-3" />
                          </Button>
                          {laudoAttachments.length > 0 && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 px-2">
                                  <Image className="h-3 w-3 mr-1" />
                                  {laudoAttachments.length}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Anexos — SN {l.sn}</DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-3">
                                  {laudoAttachments.map((att) => (
                                    <div key={att.id} className="relative group">
                                      <SignedImage getSignedUrl={getSignedUrl} filePath={att.file_path} alt={att.file_name} />
                                      <p className="text-xs text-muted-foreground mt-1 truncate">{att.file_name}</p>
                                      {isAdmin && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => deleteAttachment.mutate({ id: att.id, filePath: att.file_path })}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                      {/* Ação */}
                      <TableCell>
                        {laudoData?.concluido ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 text-[10px]">Fechado</Badge>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Select
                              value={closingDestino[l.sn] || "reparo"}
                              onValueChange={(v) => setClosingDestino((p) => ({ ...p, [l.sn]: v as "reparo" | "obsoleto" | "aprovado" }))}
                            >
                              <SelectTrigger className="h-7 w-[130px] text-[11px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="aprovado">Aprovado (Sem Defeito)</SelectItem>
                                <SelectItem value="reparo">Reparo Externo</SelectItem>
                                <SelectItem value="obsoleto">Obsoleto/Sucata</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant={(closingDestino[l.sn] === "aprovado") ? "outline" : "default"}
                              className={`h-7 px-2 gap-1 text-[11px] ${(closingDestino[l.sn] === "aprovado") ? "border-green-500 text-green-700 hover:bg-green-500/10" : ""}`}
                              onClick={() => handleCloseLaudo(l.sn)}
                            >
                              {(closingDestino[l.sn] === "aprovado") ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              Fechar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Utility function to count laudo items — reusable in Dashboard
 */
export function countLaudos(items: LabItem[]): number {
  const snMap = new Map<string, LabItem[]>();
  for (const item of items) {
    if (!item.sn?.trim()) continue;
    const key = item.sn.trim().toUpperCase();
    if (!snMap.has(key)) snMap.set(key, []);
    snMap.get(key)!.push(item);
  }

  let count = 0;
  for (const [, entries] of snMap) {
    if (entries.length < 2) continue;
    const sorted = [...entries].sort(
      (a, b) => new Date(a.data_entrada).getTime() - new Date(b.data_entrada).getTime()
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].data_entrada);
      const curr = new Date(sorted[i].data_entrada);
      const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 60 && diffDays >= 0) {
        count++;
        break;
      }
    }
  }
  return count;
}
