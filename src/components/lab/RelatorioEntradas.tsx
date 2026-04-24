import { useState, useMemo } from "react";
import { useLabItems } from "@/hooks/useLabItems";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { LabItem } from "@/types/LabItem";

interface Props {
  userRole?: string | null;
}

export function RelatorioEntradas({ userRole }: Props) {
  const canExport = userRole === "admin" || userRole === "supervisor";
  const { items, isLoading } = useLabItems();

  const getDestino = (item: Pick<LabItem, "categoria" | "interesse">) => {
    const categoria = item.categoria
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (categoria?.includes("nao interesse")) return "Obsoletos";
    if (categoria?.includes("interesse")) return "Teste";
    return item.interesse ? "Teste" : "Obsoletos";
  };

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterNome, setFilterNome] = useState("all");
  const [filterDestino, setFilterDestino] = useState("all");
  const [filterConferente, setFilterConferente] = useState("all");
  const [filterOrigem, setFilterOrigem] = useState("all");
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [page, setPage] = useState(1);

  const uniqueCategorias = useMemo(() => [...new Set(items.map(i => i.categoria).filter(Boolean))], [items]);
  const uniqueNomes = useMemo(() => [...new Set(items.map(i => i.nome).filter(Boolean))], [items]);
  const uniqueDestinos = useMemo(() => [...new Set(items.map(i => getDestino(i)).filter(Boolean))], [items]);
  const uniqueConferentes = useMemo(() => [...new Set(items.map(i => i.conferente).filter(Boolean))], [items]);
  const uniqueOrigens = useMemo(() => [...new Set(items.map(i => i.origem).filter(Boolean))], [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (dateFrom && i.data_entrada < dateFrom) return false;
      if (dateTo && i.data_entrada > dateTo) return false;
      if (filterCategoria !== "all" && i.categoria !== filterCategoria) return false;
      if (filterNome !== "all" && i.nome !== filterNome) return false;
      if (filterDestino !== "all" && getDestino(i) !== filterDestino) return false;
      if (filterConferente !== "all" && i.conferente !== filterConferente) return false;
      if (filterOrigem !== "all" && i.origem !== filterOrigem) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !i.sn.toLowerCase().includes(s) &&
          !i.codigo.toLowerCase().includes(s) &&
          !i.nome.toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [items, dateFrom, dateTo, filterCategoria, filterNome, filterDestino, filterConferente, filterOrigem, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // KPIs
  const totalRegistros = filtered.length;
  const serialUnicos = new Set(filtered.map(i => i.sn).filter(Boolean)).size;

  // Resumo por SN
  const resumo = useMemo(() => {
    const map = new Map<string, { sn: string; quantidade: number; categoria: string; primeira: string; ultima: string }>();
    filtered.forEach(i => {
      const key = i.sn || "(vazio)";
      const existing = map.get(key);
      if (existing) {
        existing.quantidade++;
        if (i.data_entrada < existing.primeira) existing.primeira = i.data_entrada;
        if (i.data_entrada > existing.ultima) existing.ultima = i.data_entrada;
      } else {
        map.set(key, { sn: key, quantidade: 1, categoria: i.categoria, primeira: i.data_entrada, ultima: i.data_entrada });
      }
    });
    return [...map.values()].sort((a, b) => b.quantidade - a.quantidade);
  }, [filtered]);

  function exportDetailCSV() {
    if (!canExport) return;
    const header = "ID,Data Entrada,SN,Codigo,Nome,Categoria,Origem,Destino,Conferente\n";
    const rows = filtered.map(i =>
      [i.id, i.data_entrada, i.sn, i.codigo, i.nome, i.categoria, i.origem, getDestino(i), i.conferente]
        .map(v => `"${(String(v || "")).replace(/"/g, '""')}"`)
        .join(",")
    ).join("\n");
    downloadCSV(header + rows, "relatorio_entradas_detalhado.csv");
  }

  function exportResumoCSV() {
    if (!canExport) return;
    const header = "SN,Quantidade,Categoria,Primeira Entrada,Última Entrada\n";
    const rows = resumo.map(r =>
      [r.sn, r.quantidade, r.categoria, r.primeira, r.ultima]
        .map(v => `"${(String(v || "")).replace(/"/g, '""')}"`)
        .join(",")
    ).join("\n");
    downloadCSV(header + rows, "relatorio_entradas_resumo.csv");
  }

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <p className="text-muted-foreground p-4">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">📋 Relatório de Entradas (Laboratório)</h2>
        <p className="text-xs text-muted-foreground">Dados consolidados das entradas registradas no laboratório, com filtros e paginação.</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">🔍 Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Período</Label>
              <div className="flex gap-2">
                <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
                <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={filterCategoria} onValueChange={v => { setFilterCategoria(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Selecione as opções" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueCategorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Modelo</Label>
              <Select value={filterNome} onValueChange={v => { setFilterNome(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Selecione as opções" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueNomes.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Destino</Label>
              <Select value={filterDestino} onValueChange={v => { setFilterDestino(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Selecione as opções" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueDestinos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Conferente</Label>
              <Select value={filterConferente} onValueChange={v => { setFilterConferente(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Selecione as opções" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueConferentes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Origem</Label>
              <Select value={filterOrigem} onValueChange={v => { setFilterOrigem(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Selecione as opções" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueOrigens.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Busca por Serial/Código</Label>
              <Input placeholder="Buscar..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="flex gap-3">
        <Card className="border-primary/30 flex-1">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <span className="text-xs font-medium text-primary">Registros</span>
            <span className="text-2xl font-bold">{totalRegistros}</span>
          </CardContent>
        </Card>
        <Card className="border-primary/30 flex-1">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <span className="text-xs font-medium text-primary">Seriais únicos</span>
            <span className="text-2xl font-bold">{serialUnicos}</span>
          </CardContent>
        </Card>
      </div>

      {/* Entradas detalhado */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">📋 Entradas (detalhado)</h3>
        <div className="flex flex-wrap items-center gap-4 text-sm mb-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Itens por página</Label>
            <Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Página</Label>
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[2rem] text-center">{page}</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="ml-auto text-muted-foreground text-xs">
            Total: {filtered.length} linhas • Páginas: {totalPages}
          </span>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Entrada</TableHead>
                  <TableHead>SN</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Conferente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</TableCell>
                  </TableRow>
                ) : (
                  paginated.map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="whitespace-nowrap">{i.data_entrada}</TableCell>
                      <TableCell>{i.sn}</TableCell>
                      <TableCell>{i.codigo}</TableCell>
                      <TableCell>{i.nome}</TableCell>
                      <TableCell>{i.categoria}</TableCell>
                      <TableCell>{i.origem}</TableCell>
                      <TableCell>{getDestino(i)}</TableCell>
                      <TableCell>{i.conferente}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Resumo */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">📊 Resumo</h3>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>SN</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Primeira Entrada</TableHead>
                  <TableHead>Última Entrada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumo.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem dados.</TableCell>
                  </TableRow>
                ) : (
                  resumo.slice(0, 20).map((r, idx) => (
                    <TableRow key={r.sn}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{r.sn}</TableCell>
                      <TableCell>{r.quantidade}</TableCell>
                      <TableCell>{r.categoria}</TableCell>
                      <TableCell>{r.primeira}</TableCell>
                      <TableCell>{r.ultima}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Exportador */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">📥 Exportador</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" className="gap-1.5 w-full" onClick={exportDetailCSV} disabled={!canExport}>
                  <Download className="h-4 w-4" /> Exportar detalhado (CSV)
                </Button>
              </span>
            </TooltipTrigger>
            {!canExport && <TooltipContent>Função restrita para administradores</TooltipContent>}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" className="gap-1.5 w-full" onClick={exportResumoCSV} disabled={!canExport}>
                  <Download className="h-4 w-4" /> Exportar resumo (CSV)
                </Button>
              </span>
            </TooltipTrigger>
            {!canExport && <TooltipContent>Função restrita para administradores</TooltipContent>}
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
