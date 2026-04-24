import { useState, useMemo } from "react";
import { useTestResults } from "@/hooks/useTestResults";
import { useRepairSuppliers } from "@/hooks/useRepairSuppliers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download, Filter } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  userRole?: string | null;
}

export function VisualizacaoTestes({ userRole }: Props) {
  const canExport = userRole === "admin" || userRole === "supervisor";
  const { results, isLoading } = useTestResults();
  const { suppliers } = useRepairSuppliers();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterResultado, setFilterResultado] = useState("all");
  const [filterTecnico, setFilterTecnico] = useState("all");
  const [filterNome, setFilterNome] = useState("all");
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [page, setPage] = useState(1);

  const uniqueResultados = useMemo(() => [...new Set(results.map(r => r.resultado).filter(Boolean))], [results]);
  const uniqueTecnicos = useMemo(() => [...new Set(results.map(r => r.testado_por).filter(Boolean))], [results]);
  const uniqueNomes = useMemo(() => [...new Set(results.map(r => r.nome).filter(Boolean))], [results]);

  const today = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    return results.filter(r => {
      if (dateFrom && r.data_teste < dateFrom) return false;
      if (dateTo && r.data_teste > dateTo) return false;
      if (filterResultado !== "all" && r.resultado !== filterResultado) return false;
      if (filterTecnico !== "all" && r.testado_por !== filterTecnico) return false;
      if (filterNome !== "all" && r.nome !== filterNome) return false;

      // Quick filters
      const norm = (r.resultado || "").trim();
      const isAprov = norm === "Equipamento aprovado";
      if (quickFilter === "defeitos" && isAprov) return false;
      if (quickFilter === "aprovados_hoje" && (!isAprov || r.data_teste !== today)) return false;
      if (quickFilter === "amostragem" && !r.destino_reparo) return false;

      return true;
    });
  }, [results, dateFrom, dateTo, filterResultado, filterTecnico, filterNome, quickFilter, today]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const isAprovado = (resultado: string) => {
    const normalized = (resultado || "").trim();
    return normalized === "Equipamento aprovado";
  };

  const aprovados = filtered.filter(r => isAprovado(r.resultado)).length;
  const defeitos = filtered.length - aprovados;
  const pctAprovados = filtered.length > 0 ? ((aprovados / filtered.length) * 100).toFixed(1) : "0";

  const quickFilters = [
    { key: "defeitos", label: "Somente Defeitos", count: results.filter(r => { const n = (r.resultado || "").trim(); return n !== "Equipamento aprovado"; }).length },
    { key: "aprovados_hoje", label: "Aprovados Hoje", count: results.filter(r => { const n = (r.resultado || "").trim(); return n === "Equipamento aprovado" && r.data_teste === today; }).length },
    { key: "amostragem", label: "Retorno de Reparo", count: results.filter(r => r.destino_reparo && r.destino_reparo.trim() !== "").length },
  ];

  function getResultBadge(resultado: string) {
    const norm = (resultado || "").trim();
    if (norm === "Equipamento aprovado") return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-xs" variant="outline">Aprovado</Badge>;
    return <Badge className="bg-red-500/15 text-red-700 border-red-500/30 text-xs" variant="outline">{resultado || "Defeito"}</Badge>;
  }

  function getSupplierName(destino: string) {
    if (!destino || destino.trim() === "") return "—";
    return destino;
  }

  function exportCSV() {
    if (!canExport) return;
    const header = "Data Teste,SN,Codigo,Nome,Resultado,Técnico,Fornecedor Reparo,Observacoes\n";
    const rows = filtered.map(r =>
      [r.data_teste, r.sn, r.codigo, r.nome, r.resultado, r.testado_por, r.destino_reparo, r.observacoes]
        .map(v => `"${(v || "").replace(/"/g, '""')}"`)
        .join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "relatorio_testes.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <p className="text-muted-foreground p-4">Carregando...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">📊 Relatório de Teste</h2>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={quickFilter === null ? "default" : "outline"}
          size="sm"
          onClick={() => { setQuickFilter(null); setPage(1); }}
          className="gap-1.5"
        >
          <Filter className="h-3 w-3" /> Todos
        </Button>
        {quickFilters.map(qf => (
          <Button
            key={qf.key}
            variant={quickFilter === qf.key ? "default" : "outline"}
            size="sm"
            onClick={() => { setQuickFilter(quickFilter === qf.key ? null : qf.key); setPage(1); }}
            className="gap-1.5"
          >
            {qf.label} <Badge variant="secondary" className="text-[10px] ml-1">{qf.count}</Badge>
          </Button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Período</Label>
              <div className="flex gap-2">
                <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
                <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Modelo</Label>
              <Select value={filterNome} onValueChange={v => { setFilterNome(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem>{uniqueNomes.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Resultado</Label>
              <Select value={filterResultado} onValueChange={v => { setFilterResultado(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem>{uniqueResultados.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Técnico Responsável</Label>
              <Select value={filterTecnico} onValueChange={v => { setFilterTecnico(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem>{uniqueTecnicos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/30">
          <CardHeader className="pb-1"><CardTitle className="text-xs text-primary">Total Testado</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{filtered.length}</p></CardContent>
        </Card>
        <Card className="border-emerald-500/30">
          <CardHeader className="pb-1"><CardTitle className="text-xs text-emerald-600">Aprovados</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{aprovados}</p></CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardHeader className="pb-1"><CardTitle className="text-xs text-red-600">Defeitos</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{defeitos}</p></CardContent>
        </Card>
        <Card className="border-blue-500/30">
          <CardHeader className="pb-1"><CardTitle className="text-xs text-blue-600">% Aprovação</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{pctAprovados}%</p></CardContent>
        </Card>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Itens/pág</Label>
          <Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>{["10","25","50","100"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-[2rem] text-center">{page}</span>
          <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <span className="ml-auto text-muted-foreground text-xs">Total: {filtered.length} • Páginas: {totalPages}</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>SN</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Resultado Final</TableHead>
                <TableHead>Técnico Responsável</TableHead>
                <TableHead>Fornecedor Reparo</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum resultado encontrado.</TableCell></TableRow>
              ) : paginated.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{r.data_teste}</TableCell>
                  <TableCell className="font-mono text-xs">{r.sn}</TableCell>
                  <TableCell>{r.nome}</TableCell>
                  <TableCell>{getResultBadge(r.resultado)}</TableCell>
                  <TableCell>{r.testado_por || "—"}</TableCell>
                  <TableCell>{getSupplierName(r.destino_reparo)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">{r.observacoes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV} disabled={!canExport}>
              <Download className="h-4 w-4" /> Exportar filtrado (CSV)
            </Button>
          </span>
        </TooltipTrigger>
        {!canExport && <TooltipContent>Função restrita para administradores</TooltipContent>}
      </Tooltip>
    </div>
  );
}
