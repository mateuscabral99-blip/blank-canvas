import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RepairSupplier {
  id: string;
  nome: string;
  indice_qualidade: number;
  total_reparos: number;
  total_falhas: number;
  created_at: string;
  updated_at: string;
}

export interface RepairReturn {
  id: string;
  sn: string;
  supplier_id: string;
  resultado_amostragem: string;
  encaminhamento: string;
  observacoes: string;
  created_at: string;
}

export function useRepairSuppliers() {
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["repair_suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_suppliers")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as unknown as RepairSupplier[];
    },
  });

  const updateQuality = useMutation({
    mutationFn: async ({ id, indice_qualidade, total_reparos, total_falhas }: { id: string; indice_qualidade: number; total_reparos: number; total_falhas: number }) => {
      const { error } = await supabase
        .from("repair_suppliers")
        .update({ indice_qualidade, total_reparos, total_falhas, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repair_suppliers"] }),
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from("repair_suppliers").insert({ nome });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair_suppliers"] });
      toast.success("Fornecedor cadastrado com sucesso!");
    },
    onError: () => toast.error("Erro ao cadastrar fornecedor."),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("repair_suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair_suppliers"] });
      toast.success("Fornecedor removido.");
    },
    onError: () => toast.error("Erro ao remover fornecedor."),
  });

  return {
    suppliers,
    isLoading,
    updateQuality: updateQuality.mutate,
    addSupplier: (nome: string) => addSupplierMutation.mutate(nome),
    deleteSupplier: (id: string) => deleteSupplierMutation.mutate(id),
  };
}

export function useRepairReturns() {
  const queryClient = useQueryClient();

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ["repair_returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_returns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as RepairReturn[];
    },
  });

  const addReturn = useMutation({
    mutationFn: async (data: Omit<RepairReturn, "id" | "created_at">) => {
      const { error } = await supabase.from("repair_returns").insert({
        sn: data.sn,
        supplier_id: data.supplier_id,
        resultado_amostragem: data.resultado_amostragem,
        encaminhamento: data.encaminhamento,
        observacoes: data.observacoes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair_returns"] });
      queryClient.invalidateQueries({ queryKey: ["repair_suppliers"] });
    },
    onError: () => toast.error("Erro ao registrar retorno."),
  });

  return {
    returns,
    isLoading,
    addReturn: (data: Omit<RepairReturn, "id" | "created_at">) => addReturn.mutateAsync(data),
  };
}
