import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download, MapPin, Search, ClipboardList, Fingerprint, Layers, Box, ArrowUpDown } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { LabItem } from "@/types/LabItem";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Cell } from "recharts";

interface Props {
  items: LabItem[];
  userRole?: string | null;
}

type SortKey = "data_entrada" | "sn" | "codigo" | "nome" | "categoria" | "origem" | "destino" | "conferente";
type SortDir = "asc" | "desc";

const ORIGIN_LABELS: Record<string, string> = {
  "Desconexão": "Desconexão",
  "Reversa": "Reversa",
};

const ORIGIN_COLORS = ["hsl(var(--primary))", "hsl(217 91% 30%)"];

export function InventarioLab({ items, userRole }: Props) {
  const canExport = userRole === "admin" || userRole === "supervisor";
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterNome, setFilterNome] = useState("all");
  const [filterDestino, setFilterDestino] = useState("all");
  const [filterConferente, setFilterConferente] = useState("all");
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("data_entrada");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const getDestino = (item: Pick<LabItem, "categoria" | "interesse">) => {
    const categoria = item.categoria?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
    if (categoria?.includes("nao interesse")) return "Obsoletos";
    if (categoria?.includes("interesse")) return "Teste";
    return item.interesse ? "Teste" : "Obsoletos";
  };

  const mapOriginLabel = (raw: string) => {
    const cleaned = (raw || "").toLowerCase().trim();
    if (cleaned.includes("reversa")) return "Reversa";
    // Everything else (qualidade, desconexão, null, etc) maps to "Desconexão"
    return "Desconexão";
  };

  const uniqueCategorias = useMemo(() => [...new Set(items.map(i => i.categoria).filter(Boolean))], [items]);
  const uniqueNomes = useMemo(() => [...new Set(items.map(i => i.nome).filter(Boolean))], [items]);
  const uniqueDestinos = useMemo(() => [...new Set(items.map(i => getDestino(i)).filter(Boolean))], [items]);
  const uniqueConferentes = useMemo(() => [...new Set(items.map(i => i.conferente).filter(Boolean))], [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (dateFrom && i.data_entrada < dateFrom) return false;
      if (dateTo && i.data_entrada > dateTo) return false;
      if (filterCategoria !== "all" && i.categoria !== filterCategoria) return false;
      if (filterNome !== "all" && i.nome !== filterNome) return false;
      if (filterDestino !== "all" && getDestino(i) !== filterDestino) return false;
      if (filterConferente !== "all" && i.conferente !== filterConferente) return false;
      if (search) {
        const s = search.toLowerCase();
        const codigoSearch = (i.modelo || i.codigo || "").toLowerCase();
        if (!i.sn.toLowerCase().includes(s) && !codigoSearch.includes(s) && !i.nome.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [items, dateFrom, dateTo, filterCategoria, filterNome, filterDestino, filterConferente, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va: string, vb: string;
      if (sortKey === "destino") {
        va = getDestino(a); vb = getDestino(b);
      } else {
        va = String((a as any)[sortKey] || "");
        vb = String((b as any)[sortKey] || "");
      }
      const cmp = va.localeCompare(vb, "pt-BR", { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const volumeByOrigin = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((i) => {
      const rawOrigin = i.origem || "Não informado";
      const origin = mapOriginLabel(rawOrigin);
      map.set(origin, (map.get(origin) || 0) + 1);
    });
    return [...map.entries()]
      .map(([origem, count]) => ({ origem, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const paginated = sorted.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const totalRegistros = filtered.length;
  const serialUnicos = new Set(filtered.map(i => i.sn).filter(Boolean)).size;
  const categoriasUnicas = new Set(filtered.map(i => i.categoria).filter(Boolean)).size;
  const modelosUnicos = new Set(filtered.map(i => i.nome).filter(Boolean)).size;

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

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function exportDetailCSV() {
    if (!canExport) return;
    const header = "Data Entrada,SN,Código,Nome,Categoria,Origem,Destino,Conferente\n";
    const rows = filtered.map(i =>
      [i.data_entrada, i.sn, i.modelo || "", i.nome, i.categoria, i.origem, getDestino(i), i.conferente]
        .map(v => `"${(String(v || "")).replace(/"/g, '""')}"`)
        .join(",")
    ).join("\n");
    downloadCSV(header + rows, "relatorio_entrada_detalhado.csv");
  }

  function exportResumoCSV() {
    if (!canExport) return;
    const header = "SN,Quantidade,Categoria,Primeira Entrada,Última Entrada\n";
    const rows = resumo.map(r =>
      [r.sn, r.quantidade, r.categoria, r.primeira, r.ultima]
        .map(v => `"${(String(v || "")).replace(/"/g, '""')}"`)
        .join(",")
    ).join("\n");
    downloadCSV(header + rows, "relatorio_entrada_resumo.csv");
  }

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const originBadgeColor = (origin: string) => {
    const o = origin?.toLowerCase() || "";
    if (o.includes("desconex")) return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300/40";
    if (o.includes("reversa")) return "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300/40";
    return "bg-muted text-muted-foreground border-border/40";
  };

  const destinoBadgeColor = (dest: string) => {
    if (dest === "Teste") return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300/40";
    if (dest === "Obsoletos") return "bg-red-500/15 text-red-700 dark:text-red-300 border-red-300/40";
    return "bg-green-500/15 text-green-700 dark:text-green-300 border-green-300/40";
  };

  const kpis = [
    { label: "Registros", value: totalRegistros, icon: ClipboardList },
    { label: "Seriais únicos", value: serialUnicos, icon: Fingerprint },
    { label: "Categorias", value: categoriasUnicas, icon: Layers },
    { label: "Modelos", value: modelosUnicos, icon: Box },
  ];

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-primary" : "text-muted-foreground/50"}`} />
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Header + Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">📋 Relatório de Entrada</h2>
          <p className="text-xs text-muted-foreground">Dados consolidados das entradas registradas no laboratório.</p>
        </div>
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={exportDetailCSV} disabled={!canExport}>
                  <Download className="h-4 w-4" /> Detalhado
                </Button>
              </span>
            </TooltipTrigger>
            {!canExport && <TooltipContent>Função restrita para administradores</TooltipContent>}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={exportResumoCSV} disabled={!canExport}>
                  <Download className="h-4 w-4" /> Resumo
                </Button>
              </span>
            </TooltipTrigger>
            {!canExport && <TooltipContent>Função restrita para administradores</TooltipContent>}
          </Tooltip>
        </div>
      </div>

      {/* Chart */}
      {volumeByOrigin.length > 0 && (
        <Card className="shadow-sm border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Volume por Origem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Quantidade", color: "hsl(var(--primary))" } }} className="h-[220px] w-full">
              <BarChart data={volumeByOrigin} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="origem" tick={{ fontSize: 11 }} width={140} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Quantidade">
                  {volumeByOrigin.map((_, idx) => (
                    <Cell key={idx} fill={ORIGIN_COLORS[idx % ORIGIN_COLORS.length]} />
                  ))}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Filters — compact single row */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">De</Label>
              <Input type="date" className="h-8 text-xs" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Até</Label>
              <Input type="date" className="h-8 text-xs" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Categoria</Label>
              <Select value={filterCategoria} onValueChange={v => { setFilterCategoria(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todas</SelectItem>{uniqueCategorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Modelo</Label>
              <Select value={filterNome} onValueChange={v => { setFilterNome(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem>{uniqueNomes.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Destino</Label>
              <Select value={filterDestino} onValueChange={v => { setFilterDestino(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem>{uniqueDestinos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Conferente</Label>
              <Select value={filterConferente} onValueChange={v => { setFilterConferente(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem>{uniqueConferentes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 max-w-xs relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por Serial / Código / Nome..."
              className="h-8 text-xs pl-8"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border border-border/50">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground leading-none mb-0.5">{kpi.label}</p>
                <p className="text-2xl font-bold leading-none">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination + Table */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Itens/pág</Label>
          <Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{["10","25","50","100"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-[2rem] text-center text-xs">{page}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <span className="ml-auto text-muted-foreground text-xs">Total: {filtered.length} • Páginas: {totalPages}</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="Data" field="data_entrada" />
                <SortHeader label="SN" field="sn" />
                <SortHeader label="Código" field="codigo" />
                <SortHeader label="Nome" field="nome" />
                <SortHeader label="Categoria" field="categoria" />
                <SortHeader label="Origem" field="origem" />
                <SortHeader label="Destino" field="destino" />
                <SortHeader label="Conferente" field="conferente" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum registro.</TableCell></TableRow>
              ) : paginated.map(i => {
                const destino = getDestino(i);
                return (
                  <TableRow key={i.id}>
                    <TableCell className="whitespace-nowrap text-xs">{i.data_entrada}</TableCell>
                    <TableCell className="font-mono text-xs">{i.sn}</TableCell>
                    <TableCell className="font-mono text-xs">{i.codigo || "-"}</TableCell>
                    <TableCell className="text-xs">{i.nome}</TableCell>
                    <TableCell className="text-xs">{i.categoria}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-medium ${originBadgeColor(i.origem)}`}>
                        {i.origem}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-medium ${destinoBadgeColor(destino)}`}>
                        {destino}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{i.conferente}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">📊 Resumo por SN</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>SN</TableHead><TableHead>Qtd</TableHead><TableHead>Categoria</TableHead><TableHead>Primeira</TableHead><TableHead>Última</TableHead></TableRow></TableHeader>
            <TableBody>
              {resumo.slice(0, 20).map((r, idx) => (
                <TableRow key={r.sn}><TableCell>{idx + 1}</TableCell><TableCell>{r.sn}</TableCell><TableCell>{r.quantidade}</TableCell><TableCell>{r.categoria}</TableCell><TableCell>{r.primeira}</TableCell><TableCell>{r.ultima}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
