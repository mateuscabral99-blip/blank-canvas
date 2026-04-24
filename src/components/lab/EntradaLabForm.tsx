import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  LogIn, Barcode, Hash,
  CalendarDays, Tag, ArrowRightLeft, MapPin, UserCheck, Package,
  Layers, ListPlus, Download, Loader2
} from "lucide-react";
import { LabItem } from "@/types/LabItem";
import { ImportCSV } from "./ImportCSV";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type NewItem = Omit<LabItem, "id" | "status_final" | "acao_recomendada" | "created_at">;

interface Props {
  onAdd: (data: NewItem) => void;
  onImportBatch: (items: NewItem[]) => void;
  isBatchLoading?: boolean;
}

export function EntradaLabForm({ onAdd, onImportBatch, isBatchLoading }: Props) {
  const [codigo, setCodigo] = useState("");
  const [sn, setSn] = useState("");
  const [snBulk, setSnBulk] = useState("");
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<string>("Interesse");
  const [origem, setOrigem] = useState<string>("Reversa");
  const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().slice(0, 10));
  const [destinacao, setDestinacao] = useState<"Teste" | "Obsoleto">("Teste");
  const [conferidoPor, setConferidoPor] = useState("");
  const [classificacao, setClassificacao] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const bulkSerials = useMemo(() => {
    if (!snBulk.trim()) return [];
    return snBulk.split("\n").map(s => s.trim()).filter(Boolean);
  }, [snBulk]);

  useEffect(() => {
    setDestinacao(categoria === "Não Interesse" ? "Obsoleto" : "Teste");
  }, [categoria]);

  // Auto-fill from cadastro_modelos when codigo changes
  const lookupCodigo = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setAutoFilled(false);
      return;
    }

    setLookupLoading(true);
    try {
      const { data, error } = await supabase
        .from("cadastro_modelos")
        .select("nome, classificacao")
        .eq("codigo", trimmed)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setNome(data.nome);
        setClassificacao(data.classificacao || "");
        setAutoFilled(true);
      } else {
        setAutoFilled(false);
      }
    } catch {
      setAutoFilled(false);
    } finally {
      setLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      lookupCodigo(codigo);
    }, 400);
    return () => clearTimeout(timeout);
  }, [codigo, lookupCodigo]);

  const buildItem = (serial: string): NewItem => {
    const interesse = destinacao === "Teste";
    const origemFluxo: "qualidade" | "reversa" = origem === "Desconexão" ? "qualidade" : "reversa";
    return {
      codigo: codigo.trim(),
      sn: serial.trim(),
      nome: nome.trim(),
      categoria,
      interesse,
      origem,
      origem_fluxo: origemFluxo,
      status_teste: "pendente",
      dias_estoque: 0,
      valor_estimado: 0,
      data_entrada: dataRecebimento,
      conferente: conferidoPor,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome do item.");
      return;
    }

    if (bulkMode) {
      if (bulkSerials.length === 0) {
        toast.error("Adicione ao menos um Serial Number na lista.");
        return;
      }
      const items = bulkSerials.map(s => buildItem(s));
      onImportBatch(items);
      setSnBulk("");
      setCodigo("");
      setNome("");
      setClassificacao("");
      setAutoFilled(false);
      toast.success(`✅ ${items.length} itens registrados com sucesso!`, {
        description: `${nome.trim()} — lote adicionado ao laboratório.`,
      });
    } else {
      onAdd(buildItem(sn));
      setCodigo("");
      setSn("");
      setNome("");
      setClassificacao("");
      setAutoFilled(false);
      toast.success("✅ Entrada registrada com sucesso!", {
        description: `${nome.trim()} adicionado ao laboratório.`,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      toast.info("Use o botão 'Importar CSV' para processar o arquivo.", { description: file.name });
    } else if (file) {
      toast.error("Apenas arquivos .csv são aceitos.");
    }
  };

  return (
    <Card className="border-border/60 shadow-sm bg-card">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <LogIn className="h-4.5 w-4.5 text-primary" />
            </div>
            Registrar Entrada ao Lab
          </CardTitle>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 border border-border/40">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <Label htmlFor="bulk-mode" className="text-xs font-medium cursor-pointer whitespace-nowrap">
                Modo Lote
              </Label>
              <Switch id="bulk-mode" checked={bulkMode} onCheckedChange={setBulkMode} />
            </div>

            <div
              className={cn(
                "ml-auto flex items-center gap-2 rounded-lg border p-1.5 transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-border/40 bg-muted/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <a href="/modelo_entrada_lab.csv" download="modelo_entrada_lab.csv">
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-xs hover:bg-background">
                  <Download className="h-3.5 w-3.5" /> Baixar Modelo de Referência
                </Button>
              </a>
              <div className="h-5 w-px bg-border/60" />
              <ImportCSV onImportBatch={onImportBatch} isLoading={isBatchLoading} />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN — Fixed fields */}
            <div className="space-y-6">
              {/* Identificação */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" /> Identificação
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="codigo" className="text-xs font-medium">Código I-MANAGER</Label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="codigo"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        placeholder="Ex: IM-00123"
                        className="pl-10 focus-visible:ring-primary/40"
                      />
                      {lookupLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                      )}
                    </div>
                    {autoFilled && (
                      <p className="text-[11px] text-primary flex items-center gap-1 mt-0.5">
                        <Package className="h-3 w-3" /> Preenchido automaticamente pelo cadastro
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nome" className="text-xs font-medium">
                      Nome do Item <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="nome"
                        value={nome}
                        onChange={(e) => { setNome(e.target.value); setAutoFilled(false); }}
                        placeholder="Nome do equipamento"
                        required
                        className={cn("pl-10 focus-visible:ring-primary/40", lookupLoading && "opacity-60")}
                      />
                      {lookupLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="classificacao" className="text-xs font-medium">Classificação</Label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="classificacao"
                        value={classificacao}
                        onChange={(e) => { setClassificacao(e.target.value); setAutoFilled(false); }}
                        placeholder="Ex: ONT WIFI 6"
                        className={cn("pl-10 focus-visible:ring-primary/40", lookupLoading && "opacity-60")}
                      />
                      {lookupLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Logística */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Logística
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Categoria</Label>
                    <Select value={categoria} onValueChange={setCategoria}>
                      <SelectTrigger className="focus:ring-primary/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Interesse">Interesse</SelectItem>
                        <SelectItem value="Não Interesse">Não Interesse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Origem</Label>
                    <Select value={origem} onValueChange={setOrigem}>
                      <SelectTrigger className="focus:ring-primary/40">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Reversa">Reversa</SelectItem>
                        <SelectItem value="Desconexão">Desconexão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Destinação</Label>
                    <Select value={destinacao} onValueChange={(v) => setDestinacao(v as "Teste" | "Obsoleto")}>
                      <SelectTrigger className="focus:ring-primary/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Teste">Teste</SelectItem>
                        <SelectItem value="Obsoleto">Obsoleto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — Variable fields */}
            <div className="space-y-6">
              {/* Serial Number */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Barcode className="h-3.5 w-3.5" /> {bulkMode ? "Lista de Seriais" : "Serial Number"}
                </h3>

                {bulkMode ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Bipe ou digite um serial por linha</Label>
                      {bulkSerials.length > 0 && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <ListPlus className="h-3 w-3" />
                          {bulkSerials.length} {bulkSerials.length === 1 ? "item" : "itens"} detectados
                        </Badge>
                      )}
                    </div>
                    <Textarea
                      value={snBulk}
                      onChange={(e) => setSnBulk(e.target.value)}
                      placeholder={"SN-ABC001\nSN-ABC002\nSN-ABC003\n..."}
                      className="min-h-[160px] font-mono text-sm focus-visible:ring-primary/40 resize-y"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="sn" className="text-xs font-medium">Serial Number (SN)</Label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="sn" value={sn} onChange={(e) => setSn(e.target.value)} placeholder="Ex: SN-ABC12345" className="pl-10 focus-visible:ring-primary/40" />
                    </div>
                  </div>
                )}
              </div>

              {/* Registro */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" /> Registro
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Conferido por</Label>
                    <Select value={conferidoPor} onValueChange={setConferidoPor}>
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
                    <Label htmlFor="data_recebimento" className="text-xs font-medium">Data de Recebimento</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="data_recebimento" type="date" value={dataRecebimento} onChange={(e) => setDataRecebimento(e.target.value)} className="pl-10 focus-visible:ring-primary/40" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" size="lg" className="w-full gap-2 text-sm font-semibold shadow-md hover:shadow-lg transition-shadow mt-2">
                <LogIn className="h-4 w-4" />
                {bulkMode ? `Registrar ${bulkSerials.length || ""} Entrada${bulkSerials.length !== 1 ? "s" : ""}` : "Registrar Entrada"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
