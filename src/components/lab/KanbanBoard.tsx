import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LabItem } from "@/types/LabItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardCheck, Wrench, FileText,
  Search, X, Clock, AlertTriangle, Flame, Package, ArrowRight, Tag,
} from "lucide-react";
import { TesteForm } from "@/components/lab/TesteForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

/* ── Pending workflow columns ── */
const COLUMNS = [
  {
    key: "teste",
    label: "Aguardando Teste",
    icon: ClipboardCheck,
    headerBg: "bg-blue-600",
    tintBg: "bg-blue-500/5",
    cardBorder: "border-l-blue-400",
  },
  {
    key: "reparo",
    label: "Para Reparo",
    icon: Wrench,
    headerBg: "bg-sky-700",
    tintBg: "bg-sky-500/5",
    cardBorder: "border-l-sky-500",
  },
  {
    key: "laudo",
    label: "Para Laudo",
    icon: FileText,
    headerBg: "bg-purple-600",
    tintBg: "bg-purple-500/5",
    cardBorder: "border-l-purple-400",
  },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

const CLASSIFICATIONS = [
  "DECODIFICADOR IPTV","DECODIFICADOR HFC","ROTEADOR WIFI SB","MODEM DOCSIS WIFI 5",
  "ONT WIFI 5","ONT WIFI 6","ONU GPON","RADIO","ROTEADOR WIFI 5","ROTEADOR WIFI 6","ROUTERBOARD","SWITCH",
] as const;

const APPROVED_TEST_RESULT = "equipamento aprovado";
const WARN_HOURS = 24;
const CRITICAL_HOURS = 48;

function normalizeText(value: string | null | undefined) {
  return (value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

interface TestResultRow {
  id: string;
  sn: string;
  resultado: string;
  destino_reparo?: string;
  created_at: string;
}

function hoursSince(dateStr: string): number {
  const t = new Date(dateStr).getTime();
  if (!Number.isFinite(t)) return 0;
  return (Date.now() - t) / 3600000;
}

function timeAgo(dateStr: string): string {
  const hrs = hoursSince(dateStr);
  if (hrs < 1) {
    const mins = Math.floor(hrs * 60);
    return mins < 1 ? "agora" : `há ${mins}min`;
  }
  if (hrs < 24) return `há ${Math.floor(hrs)}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `há ${days}d`;
  return `há ${Math.floor(days / 30)}m`;
}

/** Days threshold to consider a re-entry as a warranty return → "Para Laudo" */
const WARRANTY_RETURN_DAYS = 60;

function daysBetween(laterIso: string, earlierIso: string): number {
  const a = new Date(laterIso).getTime();
  const b = new Date(earlierIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  return Math.max(0, Math.floor((a - b) / 86400000));
}

function classifyPending(
  item: LabItem,
  approvedSNs: Set<string>,
  reprovedSNs: Set<string>,
  warrantyReturnDays: Map<string, number>
): ColumnKey | null {
  const sn = item.sn?.trim().toUpperCase();

  // 1) Approved items are finalized — never show
  if (sn && approvedSNs.has(sn)) return null;

  // 2) Highest priority: warranty return (re-entry within the last 60 days)
  //    Decision criterion is the date of the previous exit/entry, regardless of test status.
  if (sn && warrantyReturnDays.has(sn)) return "laudo";

  // 3) Items reproved at testing → "Para Reparo" (post-test maintenance flow)
  if (sn && reprovedSNs.has(sn)) return "reparo";

  // 4) Items of interest go directly to "Aguardando Teste" (no triagem step)
  if (item.interesse && (!sn || !approvedSNs.has(sn))) {
    return "teste";
  }

  // Non-interest items are filtered out (handled as Obsoleto in the disposal flow)
  return null;
}

interface ModelGroup {
  key: string;
  nome: string;
  categoria: string;
  codigo: string;
  items: LabItem[];
  oldestHours: number;
  /** Smallest "days since previous entry" within this group (warranty return). Undefined when group is not in laudo flow. */
  minReturnDays?: number;
}

interface Props {
  items: LabItem[];
  onDelete: (id: string) => void;
  initialFilter?: string;
  isAdmin?: boolean;
  onNavigateToLaudo?: () => void;
}

export function KanbanBoard({ items, isAdmin, onNavigateToLaudo }: Props) {
  const [filterClassification, setFilterClassification] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<{ group: ModelGroup; columnLabel: string; columnKey: ColumnKey } | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [testDialogItem, setTestDialogItem] = useState<LabItem | null>(null);

  const { data: testResults = [] } = useQuery({
    queryKey: ["test_results_for_kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_results")
        .select("id, sn, resultado, destino_reparo, created_at");
      if (error) throw error;
      return data as TestResultRow[];
    },
  });

  // (laudos query removed — column membership is now driven by test results + entry history)

  const { approvedSNs, reprovedSNs, warrantyReturnDays } = useMemo(() => {
    const approved = new Set<string>();
    const reproved = new Set<string>();
    for (const t of testResults) {
      const sn = t.sn?.trim().toUpperCase();
      if (!sn) continue;
      const isApproved = normalizeText(t.resultado) === APPROVED_TEST_RESULT;
      if (isApproved) approved.add(sn);
      else reproved.add(sn);
    }

    // Detect warranty returns: SN with more than one entry in lab_items
    // where the most recent entry is within WARRANTY_RETURN_DAYS of the previous one.
    // Map stores days since the previous exit/entry.
    const entriesBySn = new Map<string, string[]>();
    for (const it of items) {
      const sn = it.sn?.trim().toUpperCase();
      if (!sn) continue;
      const list = entriesBySn.get(sn) ?? [];
      list.push(it.created_at);
      entriesBySn.set(sn, list);
    }
    const warranty = new Map<string, number>();
    entriesBySn.forEach((dates, sn) => {
      if (dates.length < 2) return;
      const sorted = [...dates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      const days = daysBetween(sorted[0], sorted[1]);
      if (days <= WARRANTY_RETURN_DAYS) warranty.set(sn, days);
    });

    return { approvedSNs: approved, reprovedSNs: reproved, warrantyReturnDays: warranty };
  }, [testResults, items]);

  const deduped = useMemo(() => {
    const snMap = new Map<string, LabItem>();
    const noSn: LabItem[] = [];
    for (const item of items) {
      if (item.modelo === 'Test Model 001' || item.sn === 'SN-FINAL-TEST-001') continue;
      const key = item.sn?.trim().toUpperCase();
      if (!key) { noSn.push(item); continue; }
      const existing = snMap.get(key);
      if (!existing || new Date(item.created_at).getTime() > new Date(existing.created_at).getTime()) {
        snMap.set(key, item);
      }
    }
    return [...snMap.values(), ...noSn];
  }, [items]);

  const filtered = useMemo(() => {
    const q = normalizeText(searchQuery);
    return deduped.filter(item => {
      if (filterClassification !== "all") {
        if (!normalizeText(item.nome).toUpperCase().includes(filterClassification.toUpperCase())) return false;
      }
      if (q && !normalizeText(item.nome).includes(q) && !normalizeText(item.sn).includes(q) && !normalizeText(item.codigo).includes(q)) return false;
      return true;
    });
  }, [deduped, filterClassification, searchQuery]);

  const classifiedItems = useMemo(() => {
    const map: Record<ColumnKey, LabItem[]> = { teste: [], reparo: [], laudo: [] };
    for (const item of filtered) {
      const col = classifyPending(item, approvedSNs, reprovedSNs, warrantyReturnDays);
      if (col) map[col].push(item);
    }
    return map;
  }, [filtered, approvedSNs, reprovedSNs, warrantyReturnDays]);

  // Group items by model name within each column
  const groupedByModel = useMemo(() => {
    const result: Record<ColumnKey, ModelGroup[]> = { teste: [], reparo: [], laudo: [] };
    for (const colKey of Object.keys(result) as ColumnKey[]) {
      const groups = new Map<string, ModelGroup>();
      for (const item of classifiedItems[colKey]) {
        const key = normalizeText(item.nome) || "sem-modelo";
        const existing = groups.get(key);
        const itemHours = hoursSince(item.created_at);
        const sn = item.sn?.trim().toUpperCase();
        const returnDays = sn ? warrantyReturnDays.get(sn) : undefined;
        if (existing) {
          existing.items.push(item);
          if (itemHours > existing.oldestHours) existing.oldestHours = itemHours;
          if (!existing.codigo && item.codigo) existing.codigo = item.codigo;
          if (returnDays !== undefined) {
            existing.minReturnDays = existing.minReturnDays === undefined
              ? returnDays
              : Math.min(existing.minReturnDays, returnDays);
          }
        } else {
          groups.set(key, {
            key,
            nome: item.nome || "Sem modelo",
            categoria: item.categoria || "",
            codigo: item.codigo || "",
            items: [item],
            oldestHours: itemHours,
            minReturnDays: returnDays,
          });
        }
      }
      // Sort by most urgent first
      result[colKey] = Array.from(groups.values()).sort((a, b) => b.oldestHours - a.oldestHours);
    }
    return result;
  }, [classifiedItems, warrantyReturnDays]);

  const totalPending =
    classifiedItems.teste.length +
    classifiedItems.reparo.length +
    classifiedItems.laudo.length;
  const hasActiveFilters = filterClassification !== "all" || searchQuery;

  // Filter SN list inside modal
  const modalFilteredItems = useMemo(() => {
    if (!openGroup) return [];
    const q = normalizeText(modalSearch);
    const sorted = [...openGroup.group.items].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    if (!q) return sorted;
    return sorted.filter(i =>
      normalizeText(i.sn).includes(q) || normalizeText(i.codigo).includes(q)
    );
  }, [openGroup, modalSearch]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Pendências Diárias</h2>
          <p className="text-xs text-muted-foreground">
            {totalPending} {totalPending === 1 ? "item em processo" : "itens em processo"} no laboratório
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-background rounded-xl border border-border/60 shadow-sm">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar modelo ou serial..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 rounded-lg text-sm"
          />
        </div>
        <Select value={filterClassification} onValueChange={setFilterClassification}>
          <SelectTrigger className="w-[200px] h-9 rounded-lg text-sm"><SelectValue placeholder="Classificação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas classificações</SelectItem>
            {CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={() => { setFilterClassification("all"); setSearchQuery(""); }}>
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const groups = groupedByModel[col.key] || [];
          const totalItems = (classifiedItems[col.key] || []).length;
          const Icon = col.icon;

          return (
            <div key={col.key} className="flex flex-col">
              {/* Header with counter */}
              <div className={`${col.headerBg} text-white rounded-t-xl px-4 py-3 flex items-center justify-between shadow-sm`}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 opacity-90" />
                  <span className="text-sm font-semibold">{col.label}</span>
                </div>
                <span className="bg-white/25 text-white text-[11px] font-bold rounded-full px-2.5 py-0.5">
                  {totalItems} {totalItems === 1 ? "item" : "itens"}
                </span>
              </div>

              {/* Body — compact model cards */}
              <div className={`${col.tintBg} border border-t-0 border-border/40 rounded-b-xl p-2.5 min-h-[400px] space-y-2 flex-1`}>
                {groups.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center pt-12 opacity-60">Nenhum item pendente</p>
                )}
                {groups.map((group) => {
                  const isCritical = group.oldestHours >= CRITICAL_HOURS;
                  const isWarn = !isCritical && group.oldestHours >= WARN_HOURS;

                  const accentClass = isCritical
                    ? "border-l-red-500"
                    : isWarn
                    ? "border-l-orange-500"
                    : col.cardBorder;

                  const counterClass = isCritical
                    ? "bg-red-500 text-white"
                    : isWarn
                    ? "bg-orange-500 text-white"
                    : "bg-primary text-primary-foreground";

                  return (
                    <button
                      key={group.key}
                      onClick={() => { setOpenGroup({ group, columnLabel: col.label, columnKey: col.key }); setModalSearch(""); }}
                      className={`group w-full text-left relative rounded-lg border border-l-[4px] ${accentClass} bg-background p-2.5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40`}
                    >
                      {isCritical && (
                        <Flame className="absolute top-2 right-2 h-3.5 w-3.5 text-red-500 animate-pulse" />
                      )}
                      {isWarn && (
                        <AlertTriangle className="absolute top-2 right-2 h-3.5 w-3.5 text-orange-500" />
                      )}

                      <div className="flex items-center gap-2.5">
                        <div className={`${counterClass} shrink-0 h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm`}>
                          {group.items.length}
                        </div>
                        <div className="min-w-0 flex-1 pr-4">
                          {group.codigo && (
                            <div className="flex items-center gap-1 mb-0.5">
                              <Tag className="h-2.5 w-2.5 text-primary" />
                              <span
                                className="font-mono text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded truncate max-w-full"
                                title={`I-MANAGER: ${group.codigo}`}
                              >
                                {group.codigo}
                              </span>
                            </div>
                          )}
                          <p className="font-semibold text-xs leading-tight line-clamp-2" title={group.nome}>
                            {group.nome}
                          </p>
                          {group.categoria && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{group.categoria}</p>
                          )}
                          <div className="flex items-center gap-1 text-muted-foreground mt-1">
                            <Clock className="h-2.5 w-2.5" />
                            <span className="text-[9px]">mais antigo: {Math.floor(group.oldestHours)}h</span>
                          </div>
                          {col.key === "laudo" && group.minReturnDays !== undefined && (
                            <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-400/40 px-1.5 py-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              <span className="text-[9px] font-semibold uppercase tracking-wide">
                                Retorno em {group.minReturnDays} {group.minReturnDays === 1 ? "dia" : "dias"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-2 px-1">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Parado &gt; 24h
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Crítico &gt; 48h
        </span>
        <span className="ml-auto text-[10px] opacity-70">Clique em um card para ver os SNs agrupados</span>
      </div>

      {/* Group detail modal */}
      <Dialog open={!!openGroup} onOpenChange={(open) => { if (!open) { setOpenGroup(null); setModalSearch(""); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-primary" />
              <span className="truncate">{openGroup?.group.nome}</span>
              <Badge variant="secondary" className="ml-2">
                {openGroup?.group.items.length} {openGroup?.group.items.length === 1 ? "item" : "itens"}
              </Badge>
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Etapa: <span className="font-medium text-foreground">{openGroup?.columnLabel}</span>
              {openGroup?.group.codigo && <> · I-MANAGER: <span className="font-mono font-semibold text-primary">{openGroup.group.codigo}</span></>}
              {openGroup?.group.categoria && <> · Categoria: <span className="font-medium text-foreground">{openGroup.group.categoria}</span></>}
            </p>
            {openGroup?.columnKey === "laudo" && onNavigateToLaudo && (
              <Button
                size="sm"
                variant="default"
                className="mt-2 gap-1.5 self-start bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => { onNavigateToLaudo(); setOpenGroup(null); }}
              >
                <FileText className="h-3.5 w-3.5" /> Abrir Laudo Técnico <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </DialogHeader>

          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar SN ou código dentro deste modelo..."
              value={modalSearch}
              onChange={e => setModalSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="overflow-y-auto flex-1 mt-3 -mx-6 px-6">
            {modalFilteredItems.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum SN encontrado.</p>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border/40">
                  <span>Serial / Código</span>
                  <span>Entrada</span>
                  <span className="text-right">Ação</span>
                </div>
                {modalFilteredItems.map((it) => {
                  const hrs = hoursSince(it.created_at);
                  const isCritical = hrs >= CRITICAL_HOURS;
                  const isWarn = !isCritical && hrs >= WARN_HOURS;
                  const dotColor = isCritical ? "bg-red-500" : isWarn ? "bg-orange-500" : "bg-emerald-500";

                  return (
                    <div
                      key={it.id}
                      className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                          <span className="font-mono text-xs font-semibold truncate" title={it.sn}>
                            {it.sn || "(sem SN)"}
                          </span>
                        </div>
                        {it.codigo && (
                          <span className="font-mono text-[10px] text-muted-foreground ml-3.5">{it.codigo}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium">
                          {(() => {
                            try {
                              return format(new Date(it.created_at), "dd/MM/yyyy HH:mm");
                            } catch {
                              return "—";
                            }
                          })()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{timeAgo(it.created_at)}</p>
                      </div>
                      {openGroup?.columnKey === "laudo" && onNavigateToLaudo ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 border-purple-400/50 text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40"
                          onClick={() => { onNavigateToLaudo(); setOpenGroup(null); }}
                          disabled={!it.sn}
                        >
                          <FileText className="h-3 w-3" /> Ir para Laudo
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => { setTestDialogItem(it); setOpenGroup(null); }}
                          disabled={!it.sn}
                        >
                          Ir para Teste <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Test shortcut dialog */}
      <Dialog open={!!testDialogItem} onOpenChange={(open) => !open && setTestDialogItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Teste — {testDialogItem?.nome}</DialogTitle>
          </DialogHeader>
          {testDialogItem && (
            <TesteForm
              labItems={[testDialogItem]}
              isAdmin={isAdmin}
              prefillSN={testDialogItem.sn}
              onComplete={() => setTestDialogItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
