import { useMemo } from "react";
import { LabItem } from "@/types/LabItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ClipboardCheck, Ban, UserCheck, FileText, TrendingUp, TrendingDown, Minus, AlertTriangle, RotateCcw, Wrench } from "lucide-react";
import { countLaudos } from "./LaudoAlerts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { useRepairSuppliers, useRepairReturns } from "@/hooks/useRepairSuppliers";
import { useTestResults } from "@/hooks/useTestResults";

interface Props {
  items: LabItem[];
  onCardClick?: (columnKey: string) => void;
}

export function Dashboard({ items, onCardClick }: Props) {
  const { suppliers } = useRepairSuppliers();
  const { returns } = useRepairReturns();
  const { results: testResults } = useTestResults();

  const normalizarCategoria = (categoria: string) =>
    categoria?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

  const vaiParaTeste = (item: LabItem) => {
    const categoria = normalizarCategoria(item.categoria);
    if (categoria?.includes("nao interesse")) return false;
    if (categoria?.includes("interesse")) return true;
    return item.interesse;
  };

  const total = items.length;
  const emTeste = items.filter(vaiParaTeste).length;
  const obsoletos = total - emTeste;
  const conferidos = total;
  const laudo = countLaudos(items);

  const custoRetrabalho = useMemo(() => {
    return returns.filter((r) => r.encaminhamento === "fila_teste").length;
  }, [returns]);

  const monthComparison = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    const thisMonthItems = items.filter(i => { const d = new Date(i.data_entrada); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
    const lastMonthItems = items.filter(i => { const d = new Date(i.data_entrada); return d.getMonth() === lastMonth && d.getFullYear() === lastYear; });
    const calcPct = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };
    return {
      total: calcPct(thisMonthItems.length, lastMonthItems.length),
      interesse: calcPct(thisMonthItems.filter(vaiParaTeste).length, lastMonthItems.filter(vaiParaTeste).length),
      obsoletos: calcPct(thisMonthItems.length - thisMonthItems.filter(vaiParaTeste).length, lastMonthItems.length - lastMonthItems.filter(vaiParaTeste).length),
      conferidos: calcPct(thisMonthItems.length, lastMonthItems.length),
      laudo: 0,
    };
  }, [items]);

  const kpis = [
    { label: "Total de Itens", value: total, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10", borderColor: "border-blue-500/20", columnKey: "all", trend: monthComparison.total },
    { label: "Interesse → Teste", value: emTeste, icon: ClipboardCheck, color: "text-emerald-500", bg: "bg-emerald-500/10", borderColor: "border-emerald-500/20", columnKey: "Aprovados", trend: monthComparison.interesse },
    { label: "Não interesse → Obsoletos", value: obsoletos, icon: Ban, color: "text-red-500", bg: "bg-red-500/10", borderColor: "border-red-500/20", columnKey: "Obsoleto", trend: monthComparison.obsoletos },
    { label: "Conferidos", value: conferidos, icon: UserCheck, color: "text-violet-500", bg: "bg-violet-500/10", borderColor: "border-violet-500/20", columnKey: "all", trend: monthComparison.conferidos },
    { label: "Laudo", value: laudo, icon: FileText, color: "text-orange-500", bg: "bg-orange-500/10", borderColor: "border-orange-500/20", columnKey: "Laudo", trend: monthComparison.laudo },
  ];

  const isAprovado = (r: string) => {
    return (r || "").trim() === "Equipamento aprovado";
  };

  // Donut 1: Taxa de Aprovação (Testes)
  const testDonutData = useMemo(() => {
    const aprovados = testResults.filter(t => isAprovado(t.resultado)).length;
    const reprovados = testResults.length - aprovados;
    return { data: [
      { name: "Aprovados", value: aprovados, color: "hsl(160, 60%, 45%)" },
      { name: "Reprovados", value: reprovados, color: "hsl(0, 70%, 55%)" },
    ], aprovados, reprovados, total: testResults.length };
  }, [testResults]);

  const taxaAprovacao = testDonutData.total > 0 ? Math.round((testDonutData.aprovados / testDonutData.total) * 100) : 0;

  // Donut 2: Taxa de Aproveitamento de Materiais
  const materialDonutData = useMemo(() => [
    { name: "Interesse", value: emTeste, color: "hsl(160, 60%, 45%)" },
    { name: "Obsoletos", value: obsoletos, color: "hsl(0, 70%, 55%)" },
  ], [emTeste, obsoletos]);

  const aproveitamento = total > 0 ? Math.round((emTeste / total) * 100) : 0;

  // Top 5 defeitos (grouped by exact result text, excluding 'Equipamento aprovado')
  const topDefeitosData = useMemo(() => {
    const counts = new Map<string, number>();

    for (const d of testResults) {
      // 1. Column: 'resultado'
      // 4. Cleaning: Ignore empty lines
      // 5. Normalization: .trim()
      const val = (d.resultado || "").trim();
      if (!val) continue;

      // 2. Filter logic: value !== 'Equipamento aprovado'
      if (val === "Equipamento aprovado") continue;

      // 3. Aggregation: Count frequency
      const key = val; 
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .slice(0, 5) // Top 5
      .map(([name, value]) => ({
        name: name.length > 30 ? name.slice(0, 27) + "..." : name,
        value,
        fullName: name,
      }));
  }, [testResults]);

  const barData = useMemo(() => {
    const days: { date: string; entradas: number; saidas: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
      days.push({
        date: dayLabel,
        entradas: items.filter(it => it.data_entrada === dateStr && vaiParaTeste(it)).length,
        saidas: items.filter(it => it.data_entrada === dateStr && !vaiParaTeste(it)).length,
      });
    }
    return days;
  }, [items]);

  const allCritical = useMemo(() => {
    const ids = new Set<string>();
    const result: LabItem[] = [];
    const criticalItems = items.filter(item => item.dias_estoque > 3 && item.status_final === "Laudo").sort((a, b) => b.dias_estoque - a.dias_estoque).slice(0, 10);
    const criticalStockItems = items.filter(item => item.dias_estoque > 60).sort((a, b) => b.dias_estoque - a.dias_estoque).slice(0, 5);
    for (const item of [...criticalItems, ...criticalStockItems]) {
      if (!ids.has(item.id)) { ids.add(item.id); result.push(item); }
    }
    return result.slice(0, 10);
  }, [items]);

  // Selected supplier for recent failures
  const selectedSupplier = useMemo(() => {
    return suppliers.length > 0 ? suppliers[0] : null;
  }, [suppliers]);

  const recentFailures = useMemo(() => {
    if (!selectedSupplier) return [];
    return returns
      .filter(r => r.supplier_id === selectedSupplier.id && r.encaminhamento === "fila_teste")
      .slice(0, 5)
      .map(ret => {
        const testResult = testResults.find(t => t.sn?.trim().toUpperCase() === ret.sn?.trim().toUpperCase() && t.destino_reparo === selectedSupplier.nome);
        return {
          id: ret.id,
          sn: ret.sn,
          data: ret.created_at.slice(0, 10),
          defeito: testResult?.observacoes || "Defeito não resolvido",
          nome: testResult?.nome || "—",
        };
      });
  }, [selectedSupplier, returns, testResults]);

  const TrendIndicator = ({ value }: { value: number }) => {
    if (value === 0) return <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Minus className="h-3 w-3" /> Sem variação</span>;
    if (value > 0) return <span className="flex items-center gap-1 text-[11px] text-emerald-600"><TrendingUp className="h-3 w-3" /> +{value}%</span>;
    return <span className="flex items-center gap-1 text-[11px] text-red-500"><TrendingDown className="h-3 w-3" /> {value}%</span>;
  };

  const barChartConfig = { entradas: { label: "Entradas", color: "hsl(160, 60%, 45%)" }, saidas: { label: "Saídas", color: "hsl(0, 70%, 55%)" } };
  const testDonutConfig = { aprovados: { label: "Aprovados", color: "hsl(160, 60%, 45%)" }, reprovados: { label: "Reprovados", color: "hsl(0, 70%, 55%)" } };
  const materialDonutConfig = { interesse: { label: "Interesse", color: "hsl(160, 60%, 45%)" }, obsoletos: { label: "Obsoletos", color: "hsl(0, 70%, 55%)" } };
  const defeitosChartConfig = { value: { label: "Ocorrências", color: "hsl(0, 70%, 55%)" } };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={`border ${kpi.borderColor} shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] bg-card`} onClick={() => onCardClick?.(kpi.columnKey)}>
            <CardContent className="p-5 flex flex-col gap-3">
              <div className={`h-11 w-11 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <span className="text-3xl font-bold tracking-tight">{kpi.value}</span>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{kpi.label}</p>
                <div className="mt-1.5"><TrendIndicator value={kpi.trend} /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Priority Row: Two Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut 1: Taxa de Aprovação (Testes) */}
        <Card className="shadow-sm border-emerald-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Taxa de Aprovação (Testes)</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <ChartContainer config={testDonutConfig} className="h-[220px] w-full">
              <PieChart>
                <Pie data={testDonutData.data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {testDonutData.data.map((entry, index) => <Cell key={`cell-test-${index}`} fill={entry.color} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="text-center -mt-2">
              <span className="text-3xl font-bold">{taxaAprovacao}%</span>
              <p className="text-xs text-muted-foreground mt-1">de aprovação nos testes</p>
            </div>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(160, 60%, 45%)" }} /><span className="text-xs text-muted-foreground">Aprovados ({testDonutData.aprovados})</span></div>
              <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(0, 70%, 55%)" }} /><span className="text-xs text-muted-foreground">Reprovados ({testDonutData.reprovados})</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Donut 2: Taxa de Aproveitamento de Materiais */}
        <Card className="shadow-sm border-emerald-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Taxa de Aproveitamento de Materiais</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <ChartContainer config={materialDonutConfig} className="h-[220px] w-full">
              <PieChart>
                <Pie data={materialDonutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {materialDonutData.map((entry, index) => <Cell key={`cell-mat-${index}`} fill={entry.color} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="text-center -mt-2">
              <span className="text-3xl font-bold">{aproveitamento}%</span>
              <p className="text-xs text-muted-foreground mt-1">de aproveitamento geral</p>
            </div>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(160, 60%, 45%)" }} /><span className="text-xs text-muted-foreground">Interesse ({emTeste})</span></div>
              <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(0, 70%, 55%)" }} /><span className="text-xs text-muted-foreground">Obsoletos ({obsoletos})</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Defeitos Horizontal Bar Chart */}
      <Card className="shadow-sm border-red-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-base font-semibold">Top Defeitos Identificados</CardTitle>
            <Badge variant="destructive" className="text-xs ml-2">{topDefeitosData.reduce((s, d) => s + d.value, 0)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">5 problemas mais frequentes nos testes reprovados</p>
        </CardHeader>
        <CardContent>
          {topDefeitosData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              Nenhum defeito registrado no período.
            </div>
          ) : (
            <ChartContainer config={defeitosChartConfig} className="h-[260px] w-full">
              <BarChart data={topDefeitosData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(0, 70%, 55%)" radius={[0, 4, 4, 0]} name="Ocorrências" />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Retrabalho Card */}
      <Card className="shadow-sm border-border/40">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-red-500" />
            <CardTitle className="text-base font-semibold">Custo de Retrabalho</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Itens que falharam e foram encaminhados para re-teste</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold text-red-500">{custoRetrabalho}</span>
            <span className="text-sm text-muted-foreground">itens em re-teste</span>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {returns.length > 0 && (
              <span>Taxa de re-teste: <strong className="text-foreground">{Math.round((custoRetrabalho / returns.length) * 100)}%</strong> dos retornos</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Flow Chart */}
      <Card className="shadow-sm border-border/40">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Fluxo — Últimos 7 dias</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={barChartConfig} className="h-[280px] w-full">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="entradas" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} name="Entradas" />
              <Bar dataKey="saidas" fill="hsl(0, 70%, 55%)" radius={[4, 4, 0, 0]} name="Saídas" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Failures + Critical Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-red-500" />
              <CardTitle className="text-base font-semibold">Últimas Falhas de Reparo</CardTitle>
              {selectedSupplier && <Badge variant="outline" className="text-xs ml-auto">{selectedSupplier.nome}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Defeitos que o prestador não resolveu</p>
          </CardHeader>
          <CardContent>
            {recentFailures.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">✅ Nenhuma falha recente</p>
            ) : (
              <div className="space-y-2.5">
                {recentFailures.map(f => (
                  <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20">
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{f.nome}</p>
                        <span className="text-[10px] text-muted-foreground">{f.data}</span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">SN: {f.sn}</p>
                      <p className="text-xs text-red-600/80 mt-1 truncate">{f.defeito}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base font-semibold">Itens Críticos</CardTitle>
              <Badge variant="destructive" className="text-xs ml-2">{allCritical.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {allCritical.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">✅ Nenhum item crítico</p>
            ) : (
              <div className="space-y-2.5">
                {allCritical.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50/50 dark:border-orange-900/40 dark:bg-orange-950/20">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.nome}</p>
                      {item.sn && <span className="text-[11px] font-mono text-muted-foreground">SN: {item.sn}</span>}
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={item.dias_estoque > 60 ? "destructive" : "secondary"} className="text-xs">{item.dias_estoque}d</Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">{item.status_final}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
