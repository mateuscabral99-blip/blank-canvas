import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LabItem, calcularStatus } from "@/types/LabItem";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type NewItem = Omit<LabItem, "id" | "status_final" | "acao_recomendada" | "created_at">;

export function useLabItems() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["lab_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as LabItem[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: NewItem) => {
      const { status_final, acao_recomendada } = calcularStatus(data);
      const { error } = await supabase.from("lab_items").insert({
        codigo: data.codigo,
        sn: data.sn,
        nome: data.nome,
        categoria: data.categoria,
        interesse: data.interesse,
        origem_fluxo: data.origem_fluxo,
        status_teste: data.status_teste,
        dias_estoque: data.dias_estoque,
        valor_estimado: data.valor_estimado,
        data_entrada: data.data_entrada,
        conferido_por: data.conferido_por,
        status_final,
        acao_recomendada,
        created_by: user?.email || "",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lab_items"] }),
    onError: () => toast.error("Erro ao cadastrar item."),
  });

  const addBatchMutation = useMutation({
    mutationFn: async (batch: NewItem[]) => {
      // Normalize date to YYYY-MM-DD (handles DD/MM/YYYY, ISO, etc.)
      const normalizeDate = (raw: string): string => {
        if (!raw) return new Date().toISOString().slice(0, 10);
        const trimmed = raw.trim();
        // Already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
        // DD/MM/YYYY or DD-MM-YYYY
        const br = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
        if (br) return `${br[3]}-${br[2]}-${br[1]}`;
        // Fallback: try Date parsing
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        return new Date().toISOString().slice(0, 10);
      };

      // Normalize status_teste to DB-allowed values: 'aprovado' | 'reprovado' | 'pendente'
      const normalizeStatusTeste = (raw: string | undefined): "aprovado" | "reprovado" | "pendente" => {
        const v = (raw || "").toString().trim().toLowerCase();
        if (v === "aprovado" || v === "approved" || v === "ok") return "aprovado";
        if (v === "reprovado" || v === "failed" || v === "reprovou") return "reprovado";
        return "pendente";
      };

      // Normalize origem_fluxo to DB-allowed values: 'qualidade' | 'reversa'
      const normalizeOrigemFluxo = (raw: string | undefined): "qualidade" | "reversa" => {
        const v = (raw || "").toString().trim().toLowerCase();
        return v === "reversa" ? "reversa" : "qualidade";
      };

      const rows = batch.map((data) => {
        const { status_final, acao_recomendada } = calcularStatus(data);
        return {
          codigo: (data.codigo || "").trim(),
          sn: (data.sn || "").trim(),
          nome: (data.nome || "").trim(),
          categoria: (data.categoria || "Interesse").trim(),
          interesse: data.interesse,
          origem_fluxo: normalizeOrigemFluxo(data.origem_fluxo),
          status_teste: normalizeStatusTeste(data.status_teste),
          dias_estoque: data.dias_estoque ?? 0,
          valor_estimado: data.valor_estimado ?? 0,
          data_entrada: normalizeDate(data.data_entrada),
          conferido_por: (data.conferido_por || "").trim(),
          status_final,
          acao_recomendada: acao_recomendada || "",
          created_by: user?.email || "",
        };
      });

      // Validate required NOT NULL fields up front so we can pinpoint the row
      const missingIdx = rows.findIndex(
        (r) => !r.nome || !r.categoria || !r.origem_fluxo || !r.status_teste || !r.status_final
      );
      if (missingIdx >= 0) {
        const r = rows[missingIdx];
        throw new Error(
          `Linha ${missingIdx + 2}: campo obrigatório vazio (nome="${r.nome}", categoria="${r.categoria}", origem_fluxo="${r.origem_fluxo}", status_teste="${r.status_teste}", status_final="${r.status_final}")`
        );
      }

      // Try bulk insert first
      const { error } = await supabase.from("lab_items").insert(rows);
      if (!error) return rows.length;

      console.error("[importBatch] Bulk insert failed:", error);

      // Fallback: insert one by one to identify the offending row
      for (let i = 0; i < rows.length; i++) {
        const { error: rowError } = await supabase.from("lab_items").insert(rows[i]);
        if (rowError) {
          console.error(`[importBatch] Row ${i + 2} failed:`, rowError, rows[i]);
          throw new Error(
            `Linha ${i + 2} (código ${rows[i].codigo}): ${rowError.message}${rowError.details ? ` — ${rowError.details}` : ""}`
          );
        }
      }
      return rows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["lab_items"] });
      toast.success(`${count} item(ns) importado(s) com sucesso!`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[importBatch] onError:", err);
      toast.error(`Erro ao importar: ${msg}`, { duration: 10000 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lab_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lab_items"] }),
    onError: () => toast.error("Erro ao excluir item."),
  });

  return {
    items,
    isLoading,
    addItem: (data: NewItem) => addMutation.mutate(data),
    addBatch: (batch: NewItem[]) => addBatchMutation.mutate(batch),
    deleteItem: (id: string) => deleteMutation.mutate(id),
    isBatchLoading: addBatchMutation.isPending,
  };
}
