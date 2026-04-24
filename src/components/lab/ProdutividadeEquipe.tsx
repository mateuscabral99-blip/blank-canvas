import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Users, TrendingUp, Clock, Award, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTestResults } from "@/hooks/useTestResults";
import { useLabItems } from "@/hooks/useLabItems";
import { useLaudos } from "@/hooks/useLaudos";
import { format, subDays, startOfDay, startOfWeek, startOfMonth, isAfter, isBefore, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from "recharts";

type Period = "today" | "week" | "month" | "custom";

export function ProdutividadeEquipe() {
  const { results } = useTestResults();
  const { items } = useLabItems();
  const { laudos } = useLaudos();
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === "today") return { from: startOfDay(now), to: now };
    if (period === "week") return { from: startOfWeek(now, { locale: ptBR }), to: now };
    if (period === "month") return { from: startOfMonth(now), to: now };
    return { from: customFrom || startOfMonth(now), to: customTo || now };
  }, [period, customFrom, customTo]);

  const filteredResults = useMemo(
    () => results.filter((r) => {
      const d = new Date(r.data_teste);
      return isAfter(d, dateRange.from) && isBefore(d, new Date(dateRange.to.getTime() + 86400000));
    }),
    [results, dateRange]
  );

  const filteredItems = useMemo(
    () => items.filter((i) => {
      const d = new Date(i.data_entrada);
      return isAfter(d, dateRange.from) && isBefore(d, new Date(dateRange.to.getTime() + 86400000));
    }),
    [items, dateRange]
  );

  // Build per-technician stats
  const techStats = useMemo(() => {
    const map: Record<string, { processed: number; approved: number; repairOrObsolete: number; entriesNew: number; laudos: number; reincidentSns: Set<string> }> = {};

    const ensure = (name: string) => {
      if (!name) return;
      if (!map[name]) map[name] = { processed: 0, approved: 0, repairOrObsolete: 0, entriesNew: 0, laudos: 0, reincidentSns: new Set() };
    };

    // Count test results
    filteredResults.forEach((r) => {
      const tech = r.testado_por?.trim();
      if (!tech) return;
      ensure(tech);
      map[tech].processed++;
      if (r.resultado === "Equipamento aprovado") map[tech].approved++;
      else map[tech].repairOrObsolete++;
    });

    // Count entries by conferido_por
    filteredItems.forEach((i) => {
      const tech = i.conferido_por?.trim();
      if (!tech) return;
      ensure(tech);
      map[tech].entriesNew++;
    });

    // Reincidence: items that were approved by a tech and came back within 60 days
    const allApproved = results.filter((r) => r.resultado === "Equipamento aprovado");
    const approvedBySn: Record<string, { tech: string; date: string }[]> = {};
    allApproved.forEach((r) => {
      if (!approvedBySn[r.sn]) approvedBySn[r.sn] = [];
      approvedBySn[r.sn].push({ tech: r.testado_por, date: r.data_teste });
    });

    // Find SNs that have multiple test results (reincident)
    const allResultsBySn: Record<string, typeof results> = {};
    results.forEach((r) => {
      if (!allResultsBySn[r.sn]) allResultsBySn[r.sn] = [];
      allResultsBySn[r.sn].push(r);
    });

    Object.values(allResultsBySn).forEach((snResults) => {
      if (snResults.length < 2) return;
      const sorted = [...snResults].sort((a, b) => new Date(a.data_teste).getTime() - new Date(b.data_teste).getTime());
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const gap = differenceInDays(new Date(curr.data_teste), new Date(prev.data_teste));
        if (gap < 60 && prev.resultado === "Equipamento aprovado") {
          const tech = prev.testado_por?.trim();
          if (tech && map[tech]) {
            map[tech].reincidentSns.add(prev.sn);
          }
        }
      }
    });

    return Object.entries(map).map(([name, s]) => ({
      name,
      processed: s.processed,
      approved: s.approved,
      repairOrObsolete: s.repairOrObsolete,
      entriesNew: s.entriesNew,
      laudos: s.laudos,
      reincidenceRate: s.approved > 0 ? Math.round((s.reincidentSns.size / s.approved) * 100) : 0,
    })).sort((a, b) => b.processed - a.processed);
  }, [filteredResults, filteredItems, results]);

  // Summary cards
  const totalDays = useMemo(() => Math.max(1, differenceInDays(dateRange.to, dateRange.from) || 1), [dateRange]);
  const totalProcessed = techStats.reduce((s, t) => s + t.processed, 0);
  const avgPerDay = (totalProcessed / totalDays).toFixed(1);

  const bestTech = useMemo(() => {
    if (!techStats.length) return "—";
    const sorted = [...techStats].filter((t) => t.processed >= 3).sort((a, b) => a.reincidenceRate - b.reincidenceRate);
    return sorted[0]?.name || techStats[0]?.name || "—";
  }, [techStats]);

  const avgLaudoTime = useMemo(() => {
    const concluded = laudos.filter((l) => l.concluido);
    if (!concluded.length) return "—";
    const diffs = concluded.map((l) => differenceInDays(new Date(l.updated_at), new Date(l.created_at)));
    return `${Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)}d`;
  }, [laudos]);

  // Chart data
  const chartData = useMemo(
    () => techStats.map((t) => ({ name: t.name, "Entradas Novas": t.entriesNew, "Testes Realizados": t.processed })),
    [techStats]
  );

  const periodButtons: { key: Period; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "week", label: "Semana" },
    { key: "month", label: "Mês" },
    { key: "custom", label: "Personalizado" },
  ];

  return (
    <div className="space-y-6">
      {/* Period filters */}
      <div className="flex flex-wrap items-center gap-2">
        {periodButtons.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={period === p.key ? "default" : "outline"}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {customFrom ? format(customFrom, "dd/MM/yy") : "De"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-xs">→</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {customTo ? format(customTo, "dd/MM/yy") : "Até"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Média Itens/Dia</p>
              <p className="text-2xl font-bold">{avgPerDay}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Award className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Técnico Destaque</p>
              <p className="text-lg font-bold truncate max-w-[160px]">{bestTech}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tempo Médio de Laudo</p>
              <p className="text-2xl font-bold">{avgLaudoTime}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Itens Processados por Técnico
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período selecionado.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="Entradas Novas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="Entradas Novas" position="right" className="text-xs fill-foreground" />
                </Bar>
                <Bar dataKey="Testes Realizados" fill="hsl(var(--primary) / 0.5)" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="Testes Realizados" position="right" className="text-xs fill-foreground" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Performance table */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Performance Individual</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-center">Total Processado</TableHead>
                <TableHead className="text-center">Aprovados</TableHead>
                <TableHead className="text-center">Reparo/Obsoletos</TableHead>
                <TableHead className="text-center">Taxa Reincidência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {techStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum dado encontrado no período.
                  </TableCell>
                </TableRow>
              )}
              {techStats.map((t) => (
                <TableRow key={t.name}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-center">{t.processed}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
                      {t.approved}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-200">
                      {t.repairOrObsolete}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn("font-bold", t.reincidenceRate > 10 ? "text-destructive" : "text-emerald-600")}>
                      {t.reincidenceRate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
