import { useState } from "react";
import { Download, FlaskConical, Search, CalendarIcon, Trash2, RotateCcw, Wifi, Monitor, Usb, Lightbulb, Globe, MessageSquare, UserCheck, AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useTestResults } from "@/hooks/useTestResults";
import { LabItem } from "@/types/LabItem";
import { ImportTestCSV } from "./ImportTestCSV";
import { toast } from "sonner";

const RESULTADOS = [
  "Antena quebrada", "Atualização de sistema", "Baixa pontencia 2.4/5G",
  "Botão danificado", "Carcaça danificada", "Com ruído", "Derrubando pon",
  "Descontinuado", "Peça Solta", "Engenharia homologação", "Equipamento aprovado",
  "Erro no software", "Instalação de Preset", "Lan/Wan queimada", "Leds queimada",
  "Lentidão na conexão", "Mal contato na entrada da fonte", "Não abre canais",
  "Não acessa", "Não autentica", "Não Habilita", "Não Liga", "Não Sincroniza",
  "Passante danificado", "Perca de Pacote", "Ping / Latencia alta", "Pintura",
  "Portas do telefone danificada", "Portas oxidadas", "Power queimado",
  "Reiniciando", "Sem acesso porta Lan", "Sem audio", "Sem Redes Wifi",
  "Sem sinal Via HDMI", "Sem Sinal Via RCA", "Sinal alto", "Travado",
  "Perda intermitente de wifi",
] as const;

const DESTINOS_REPARO = [
  "Fornecedor A",
  "Assistência Técnica B",
  "Garantia",
  "Reparo Interno",
] as const;

const CHECKLIST_ITEMS = [
  { label: "LEDs OK", icon: Lightbulb },
  { label: "Portas LAN", icon: Usb },
  { label: "Wi‑Fi", icon: Wifi },
  { label: "Acesso Web", icon: Globe },
  { label: "Carcaça", icon: Monitor },
] as const;

interface TesteFormProps {
  labItems: LabItem[];
  isAdmin?: boolean;
  prefillSN?: string;
  onComplete?: () => void;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return `há ${Math.floor(hrs / 24)}d`;
}

const isDefect = (resultado: string) => resultado !== "" && resultado !== "Equipamento aprovado";

export function TesteForm({ labItems, isAdmin, prefillSN, onComplete }: TesteFormProps) {
  const { results, addResult, addBatchResults, isBatchLoading, deleteResult } = useTestResults();
  const [sn, setSn] = useState(prefillSN || "");
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [resultado, setResultado] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [dataTeste, setDataTeste] = useState<Date>(new Date());
  const [testadoPor, setTestadoPor] = useState("");
  const [destinoReparo, setDestinoReparo] = useState("");
  const [found, setFound] = useState<boolean | null>(null);
  const [foundItem, setFoundItem] = useState<LabItem | null>(null);

  function handleSnSearch() {
    const item = labItems.find((i) => i.sn.toLowerCase() === sn.trim().toLowerCase());
    if (item) {
      setCodigo(item.codigo);
      setNome(item.nome);
      setFound(true);
      setFoundItem(item);
    } else {
      setCodigo("");
      setNome("");
      setFound(false);
      setFoundItem(null);
    }
  }

  function handleSnKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleSnSearch(); }
  }

  function resetForm() {
    setSn("");
    setCodigo("");
    setNome("");
    setResultado("");
    setObservacoes("");
    setDataTeste(new Date());
    setDestinoReparo("");
    setFound(null);
    setFoundItem(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sn.trim() || !resultado || !foundItem) {
      if (!foundItem) toast.error("Por favor, busque e selecione um equipamento válido primeiro.");
      return;
    }
    addResult({
      equipment_id: foundItem.id,
      sn: sn.trim(),
      codigo,
      nome,
      resultado: resultado,
      observacoes,
      data_teste: format(dataTeste, "yyyy-MM-dd"),
      testado_por: testadoPor,
      destino_reparo: isDefect(resultado) ? destinoReparo : "",
    });
    const statusMsg = isDefect(resultado) && destinoReparo
      ? `→ Reparo Externo (${destinoReparo})`
      : resultado;
    toast.success("✅ Teste registrado com sucesso!", { description: `SN: ${sn.trim()} — ${statusMsg}` });
    const keepTestador = testadoPor;
    const keepDate = dataTeste;
    resetForm();
    setTestadoPor(keepTestador);
    setDataTeste(keepDate);
    onComplete?.();
  }

  function badgeColor(resultado: string, destino?: string): string {
    if (resultado === "Equipamento aprovado") return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    if (destino) return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    if (["Não Liga", "Power queimado", "Lan/Wan queimada", "Leds queimada"].includes(resultado)) return "bg-red-500/15 text-red-700 border-red-500/30";
    return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  }

  const recentResults = results.slice(0, 15);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* LEFT: Form */}
        <Card className="xl:col-span-3 border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FlaskConical className="h-4.5 w-4.5 text-primary" />
                </div>
                Registrar Resultado de Teste
              </CardTitle>
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1.5 border border-border/40">
                <a href="/modelo_resultado_teste.csv" download="modelo_resultado_teste.csv">
                  <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs h-8 hover:bg-background">
                    <Download className="h-3.5 w-3.5" /> Modelo
                  </Button>
                </a>
                <div className="w-px h-5 bg-border/60" />
                <ImportTestCSV onImportBatch={addBatchResults} isLoading={isBatchLoading} />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* SN Search */}
              <div>
                <Label htmlFor="sn-teste" className="text-xs font-medium">Serial Number (SN)</Label>
                <div className="flex gap-2 mt-1.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="sn-teste"
                      value={sn}
                      onChange={(e) => { setSn(e.target.value); setFound(null); setFoundItem(null); }}
                      onKeyDown={handleSnKeyDown}
                      placeholder="Bipe ou digite o SN e pressione Enter"
                      required
                      className="pl-10 focus-visible:ring-primary/40"
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={handleSnSearch} className="gap-1.5 shrink-0">
                    <Search className="h-4 w-4" /> Buscar
                  </Button>
                </div>
              </div>

              {/* Found item card */}
              {found === true && foundItem && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">Equipamento encontrado</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Modelo:</span><p className="font-medium">{foundItem.nome}</p></div>
                    <div><span className="text-muted-foreground">Código:</span><p className="font-mono font-medium">{foundItem.codigo || "—"}</p></div>
                    <div><span className="text-muted-foreground">Categoria:</span><p className="font-medium">{foundItem.categoria}</p></div>
                    <div><span className="text-muted-foreground">Entrada:</span><p className="font-medium">{foundItem.data_entrada}</p></div>
                  </div>
                </div>
              )}
              {found === false && (
                <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    SN <strong className="font-mono">{sn}</strong> não encontrado na base de entrada. Verifique o serial e tente novamente.
                  </AlertDescription>
                </Alert>
              )}

              {/* Checklist */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Checklist de Inspeção
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {CHECKLIST_ITEMS.map(({ label, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-3"
                    >
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs font-medium text-center">{label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Referência visual para inspeção física. O resultado deve ser selecionado manualmente no campo abaixo.
                </p>
              </div>

              {/* Result + Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Resultado do Teste</Label>
                  <Select value={resultado} onValueChange={(v) => { setResultado(v); if (v === "Equipamento aprovado") setDestinoReparo(""); }} required>
                    <SelectTrigger className={cn(
                      "focus:ring-primary/40",
                      resultado === "Equipamento aprovado" && "border-emerald-500/50",
                      resultado && resultado !== "Equipamento aprovado" && "border-red-500/50"
                    )}>
                      <SelectValue placeholder="Selecione o resultado" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESULTADOS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Data do Teste</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal focus-visible:ring-primary/40", !dataTeste && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {dataTeste ? format(dataTeste, "dd/MM/yyyy") : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dataTeste} onSelect={(d) => d && setDataTeste(d)} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Conditional: Destino do Reparo */}
              {isDefect(resultado) && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-700">Destino do Reparo</span>
                  </div>
                  <Select value={destinoReparo} onValueChange={setDestinoReparo}>
                    <SelectTrigger className="focus:ring-amber-500/40 border-amber-500/30">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-amber-500" />
                        <SelectValue placeholder="Selecione o destino..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {DESTINOS_REPARO.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-amber-600/80">
                    O item será movido para a coluna "Reparo Externo" no Fluxo de Trabalho.
                  </p>
                </div>
              )}

              {/* Testador + Observações */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Testado por</Label>
                  <Select value={testadoPor} onValueChange={setTestadoPor}>
                    <SelectTrigger className="focus:ring-primary/40">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Selecione..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mateus Mendes">Mateus Mendes</SelectItem>
                      <SelectItem value="João Victor">João Victor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="obs" className="text-xs font-medium">Observações</Label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="obs"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Observações adicionais..."
                      rows={2}
                      className="pl-10 focus-visible:ring-primary/40 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button type="submit" className="flex-1 gap-2 font-semibold shadow-md hover:shadow-lg transition-shadow" disabled={!sn.trim() || !resultado}>
                  <FlaskConical className="h-4 w-4" /> Registrar Teste
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Limpar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* RIGHT: Recent results */}
        <Card className="xl:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              Resultados Recentes
              <Badge variant="outline" className="ml-auto text-xs">{results.length} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentResults.length === 0 ? (
              <p className="text-muted-foreground text-sm p-6 text-center">Nenhum resultado registrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Hora</TableHead>
                      <TableHead className="text-xs">SN</TableHead>
                      <TableHead className="text-xs">Modelo</TableHead>
                      <TableHead className="text-xs">Resultado</TableHead>
                      {isAdmin && <TableHead className="text-xs w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentResults.map((r) => (
                      <TableRow key={r.id} className="group">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-2">
                          {timeAgo(r.created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-xs py-2">{r.sn}</TableCell>
                        <TableCell className="text-xs py-2 max-w-[100px] truncate">{r.nome || "—"}</TableCell>
                        <TableCell className="py-2">
                          {r.destino_reparo ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-medium bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1">
                              <Wrench className="h-2.5 w-2.5" /> Reparo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 font-medium", badgeColor(r.resultado))}>
                              {r.resultado === "Equipamento aprovado" ? "Aprovado" : r.resultado.length > 16 ? r.resultado.slice(0, 16) + "…" : r.resultado}
                            </Badge>
                          )}
                        </TableCell>
                        {isAdmin && (
                        <TableCell className="py-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteResult(r.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
