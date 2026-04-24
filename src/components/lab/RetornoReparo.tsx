import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search, Wrench, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert,
  PackageCheck, TestTube2, Star, Cpu, CalendarDays,
  Shuffle, TrendingUp, ArrowRight, Zap, TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRepairSuppliers, useRepairReturns } from "@/hooks/useRepairSuppliers";
import { useTestResults } from "@/hooks/useTestResults";
import { LabItem } from "@/types/LabItem";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  labItems: LabItem[];
}

function getSamplingRate(qualityIndex: number, totalReparos: number): number {
  if (totalReparos < 5) return 0.5; // Novo prestador
  if (qualityIndex > 95) return 0.05; // Excelente → 5%
  if (qualityIndex >= 85) return 0.2; // Atenção → 20%
  return 0.5; // Crítico → 50%
}

function qualityLevel(index: number) {
  if (index > 90) return { label: "ALTA", color: "text-emerald-600", bgCard: "border-emerald-500/30 bg-emerald-500/5" };
  if (index > 70) return { label: "MÉDIA", color: "text-amber-600", bgCard: "border-amber-500/30 bg-amber-500/5" };
  return { label: "BAIXA", color: "text-red-600", bgCard: "border-red-500/30 bg-red-500/5" };
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)} className="focus:outline-none transition-transform hover:scale-125">
          <Star className={cn("h-7 w-7 transition-colors", star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
        </button>
      ))}
    </div>
  );
}

type SamplingResult = "sampled" | "cleared" | null;

export function RetornoReparo({ labItems }: Props) {
  const { suppliers, updateQuality } = useRepairSuppliers();
  const { returns, addReturn } = useRepairReturns();
  const { results: testResults } = useTestResults();
  const [sn, setSn] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [searched, setSearched] = useState(false);
  const [visualRating, setVisualRating] = useState(0);
  const [samplingResult, setSamplingResult] = useState<SamplingResult>(null);

  const repairInfo = useMemo(() => {
    if (!sn.trim()) return null;
    const snUpper = sn.trim().toUpperCase();
    const testWithRepair = testResults.find(
      (t) => t.sn?.trim().toUpperCase() === snUpper && t.destino_reparo && t.destino_reparo.trim() !== ""
    );
    if (!testWithRepair) return null;
    const supplier = suppliers.find((s) => s.nome === testWithRepair.destino_reparo);
    const labItem = labItems.find((i) => i.sn?.trim().toUpperCase() === snUpper);
    return { testResult: testWithRepair, supplier, labItem };
  }, [sn, testResults, suppliers, labItems]);

  // Check warranty reincidence (< 90 days)
  const warrantyAlert = useMemo(() => {
    if (!repairInfo?.supplier || !sn.trim()) return null;
    const snUpper = sn.trim().toUpperCase();
    const previousReturns = returns.filter(
      (r) => r.sn?.trim().toUpperCase() === snUpper
    );
    if (previousReturns.length === 0) return null;
    const lastReturn = previousReturns[0]; // already sorted desc
    const daysSince = Math.floor((Date.now() - new Date(lastReturn.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < 90) return { daysSince, lastDate: lastReturn.created_at.slice(0, 10) };
    return null;
  }, [repairInfo, returns, sn]);

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayReturns = returns.filter((r) => r.created_at?.slice(0, 10) === today);
    return {
      total: todayReturns.length,
      liberados: todayReturns.filter((r) => r.encaminhamento === "direto_aprovados").length,
      reteste: todayReturns.filter((r) => r.encaminhamento === "fila_teste").length,
    };
  }, [returns]);

  const handleSearch = () => {
    setSearched(true);
    setVisualRating(0);
    if (repairInfo?.supplier) {
      const rate = getSamplingRate(repairInfo.supplier.indice_qualidade, repairInfo.supplier.total_reparos);
      setSamplingResult(Math.random() < rate ? "sampled" : "cleared");
    } else {
      setSamplingResult(null);
    }
  };

  const handleSnKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleSearch(); }
  };

  const handleConfirm = async (action: "estoque" | "reteste") => {
    if (!repairInfo?.supplier) return;
    const encaminhamento = action === "estoque" ? "direto_aprovados" : "fila_teste";

    await addReturn({
      sn: sn.trim(),
      supplier_id: repairInfo.supplier.id,
      resultado_amostragem: samplingResult === "sampled" ? "sorteado" : "liberado",
      encaminhamento,
      observacoes: `${observacoes}${visualRating ? ` | Avaliação visual: ${visualRating}/5` : ""}${warrantyAlert ? " | REINCIDÊNCIA" : ""}`,
    });

    // Update supplier quality — penalize heavily for warranty reincidence
    const newTotal = repairInfo.supplier.total_reparos + 1;
    const failIncrease = warrantyAlert ? 2 : 0; // double penalty for reincidence
    const newFalhas = repairInfo.supplier.total_falhas + failIncrease;
    const newQuality = Math.round(((newTotal - newFalhas) / newTotal) * 100);
    updateQuality({
      id: repairInfo.supplier.id,
      indice_qualidade: Math.max(0, newQuality),
      total_reparos: newTotal,
      total_falhas: newFalhas,
    });

    // Update lab_item status for pipeline
    const snUpper = sn.trim().toUpperCase();
    const labItem = labItems.find((i) => i.sn?.trim().toUpperCase() === snUpper);
    if (labItem) {
      await supabase
        .from("equipamentos")
        .update({
          status_final: action === "estoque" ? "Aprovado" : "Pendente",
          acao_recomendada: action === "estoque" ? "Estoque" : "Re-teste Amostragem",
        })
        .eq("id", labItem.id);
    }

    toast.success(
      action === "estoque" ? "✅ Liberado para Estoque!" : "⚠️ Encaminhado para Re-teste!",
      { description: `SN: ${sn.trim()} — ${repairInfo.supplier.nome}` }
    );

    setSn(""); setObservacoes(""); setSearched(false); setVisualRating(0); setSamplingResult(null);
  };

  const recentReturns = returns.slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* LEFT: Triage */}
        <Card className="xl:col-span-3 border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Shuffle className="h-4.5 w-4.5 text-amber-600" />
              </div>
              Central de Triagem — Amostragem Inteligente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div>
              <Label className="text-xs font-medium">Serial Number do Item</Label>
              <div className="flex gap-2 mt-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={sn} onChange={(e) => { setSn(e.target.value); setSearched(false); setSamplingResult(null); }} onKeyDown={handleSnKeyDown} placeholder="Bipe o SN do item" className="pl-10 focus-visible:ring-amber-500/40" />
                </div>
                <Button type="button" variant="outline" onClick={handleSearch} className="gap-1.5 shrink-0">
                  <Search className="h-4 w-4" /> Consultar
                </Button>
              </div>
            </div>

            {searched && !repairInfo && (
              <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
                <AlertTriangle className="h-5 w-5" />
                <AlertDescription className="text-sm">SN <strong className="font-mono">{sn}</strong> não encontrado em Reparo Externo.</AlertDescription>
              </Alert>
            )}

            {searched && repairInfo && repairInfo.supplier && (
              <>
                {/* Warranty Alert */}
                {warrantyAlert && (
                  <div className="rounded-xl border-2 border-red-500/50 bg-red-500/10 p-4 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0">
                      <TriangleAlert className="h-8 w-8 text-red-600" />
                    </div>
                    <div>
                      <p className="font-bold text-red-700 text-lg">REINCIDÊNCIA — COBRAR GARANTIA</p>
                      <p className="text-sm text-red-600/80">
                        Item retornou {warrantyAlert.daysSince} dias após último reparo ({warrantyAlert.lastDate}). Dentro do prazo de garantia de 90 dias.
                      </p>
                    </div>
                  </div>
                )}

                {/* Sampling Banner */}
                {samplingResult === "cleared" && (
                  <div className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 p-4 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-700 text-lg">LIBERADO — Direto para Estoque</p>
                      <p className="text-sm text-emerald-600/80">Item não sorteado para amostragem.</p>
                    </div>
                  </div>
                )}
                {samplingResult === "sampled" && (
                  <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-4 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Zap className="h-8 w-8 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-bold text-amber-700 text-lg">SORTEADO PARA AMOSTRAGEM</p>
                      <p className="text-sm text-amber-600/80">Enviar para Bancada de Teste.</p>
                    </div>
                  </div>
                )}

                {/* Item Info Card */}
                <div className="rounded-xl border border-border/60 bg-muted/30 p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-primary" />
                        <span className="font-bold text-base">{repairInfo.labItem?.nome || repairInfo.testResult.nome || "—"}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        SN: {sn.trim().toUpperCase()}{repairInfo.labItem?.codigo && ` • ${repairInfo.labItem.codigo}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">{repairInfo.labItem?.categoria || "—"}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn("rounded-lg border p-3 space-y-1", qualityLevel(repairInfo.supplier.indice_qualidade).bgCard)}>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Fornecedor</p>
                      <p className="font-semibold text-sm">{repairInfo.supplier.nome}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {repairInfo.supplier.indice_qualidade > 90 ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-amber-600" />}
                        <span className={cn("text-sm font-bold", qualityLevel(repairInfo.supplier.indice_qualidade).color)}>{repairInfo.supplier.indice_qualidade}%</span>
                        <span className="text-[10px] text-muted-foreground ml-1">({repairInfo.supplier.total_reparos} reparos)</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Amostragem: {Math.round(getSamplingRate(repairInfo.supplier.indice_qualidade, repairInfo.supplier.total_reparos) * 100)}%</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background p-3 space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Detalhes</p>
                      <div className="flex items-center gap-1.5 text-sm"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /><span>Teste: {repairInfo.testResult.data_teste}</span></div>
                      <div className="flex items-center gap-1.5 text-sm"><Wrench className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs">Defeito original</span></div>
                      <p className="text-xs text-muted-foreground truncate">{repairInfo.testResult.observacoes || "Sem observações"}</p>
                    </div>
                  </div>
                </div>

                {/* Visual Rating */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Nota Visual do Conserto (1-5)</Label>
                  <div className="flex items-center gap-3">
                    <StarRating value={visualRating} onChange={setVisualRating} />
                    <span className="text-xs text-muted-foreground">
                      {visualRating === 0 && "Não avaliado"}{visualRating === 1 && "Péssimo"}{visualRating === 2 && "Ruim"}{visualRating === 3 && "Regular"}{visualRating === 4 && "Bom"}{visualRating === 5 && "Excelente"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Observações</Label>
                  <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Estado visual, acessórios, etc." rows={2} className="focus-visible:ring-amber-500/40 resize-none" />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {samplingResult === "cleared" && !warrantyAlert ? (
                    <>
                      <Button onClick={() => handleConfirm("estoque")} className="h-16 text-base font-bold gap-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                        <PackageCheck className="h-7 w-7" /> Confirmar — Estoque Aprovado
                      </Button>
                      <Button onClick={() => handleConfirm("reteste")} variant="outline" className="h-16 text-base font-medium gap-3 rounded-xl border-amber-500/40 text-amber-700 hover:bg-amber-500/10">
                        <TestTube2 className="h-6 w-6" /> Enviar para Re-teste
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => handleConfirm("reteste")} className={cn("h-16 text-base font-bold gap-3 rounded-xl text-white shadow-lg sm:col-span-2", warrantyAlert ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20")}>
                      <TestTube2 className="h-7 w-7" /> {warrantyAlert ? "Re-teste Obrigatório (Garantia)" : "Encaminhar para Re-teste"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Monitor */}
        <Card className="xl:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" /> Monitor de Amostragem
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{todayStats.total}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">Retornos Hoje</p>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{todayStats.liberados}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">Liberados</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{todayStats.reteste}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">Re-teste</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><ArrowRight className="h-3 w-3" /> Últimos Processados</p>
              {recentReturns.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
                  <Shuffle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Nenhum retorno registrado hoje.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead className="text-xs">SN</TableHead><TableHead className="text-xs">Fornecedor</TableHead><TableHead className="text-xs text-center">Destino</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {recentReturns.map((r) => {
                        const supplier = suppliers.find((s) => s.id === r.supplier_id);
                        const isEstoque = r.encaminhamento === "direto_aprovados";
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-xs py-2.5">{r.sn}</TableCell>
                            <TableCell className="text-xs py-2.5">{supplier?.nome || "—"}</TableCell>
                            <TableCell className="py-2.5 text-center">
                              <Badge className={cn("text-[10px] px-2 py-0.5 gap-1 font-semibold", isEstoque ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" : "bg-amber-500/15 text-amber-700 border-amber-500/30")} variant="outline">
                                {isEstoque ? <><PackageCheck className="h-3 w-3" /> Estoque</> : <><TestTube2 className="h-3 w-3" /> Re-teste</>}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Taxas de Amostragem</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between"><span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-600" /> Excelente (&gt;95%)</span><span className="font-semibold text-foreground">5%</span></div>
                <div className="flex justify-between"><span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-amber-600" /> Atenção (85-95%)</span><span className="font-semibold text-foreground">20%</span></div>
                <div className="flex justify-between"><span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-600" /> Crítico (&lt;85%)</span><span className="font-semibold text-foreground">50%</span></div>
                <div className="flex justify-between"><span className="flex items-center gap-1"><Shuffle className="h-3 w-3 text-blue-600" /> Novo (&lt;5)</span><span className="font-semibold text-foreground">50%</span></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
