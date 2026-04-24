import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface TestResult {
  id: string;
  equipment_id: string;
  sn: string;
  codigo: string;
  nome: string;
  resultado: string;
  observacoes: string;
  data_teste: string;
  testado_por: string;
  destino_reparo: string;
  created_at: string;
}

export type NewTestResult = Omit<TestResult, "id" | "created_at">;

export function useTestResults() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["test_results"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_results")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as TestResult[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: NewTestResult) => {
      // 1. Create test result
      const { error: insertError } = await supabase.from("test_results").insert({
        equipment_id: data.equipment_id,
        sn: data.sn,
        codigo: data.codigo,
        nome: data.nome,
        resultado: data.resultado,
        observacoes: data.observacoes,
        data_teste: data.data_teste,
        testado_por: data.testado_por,
        destino_reparo: data.destino_reparo || "",
        created_by: user?.email || "",
      });
      if (insertError) throw insertError;

      // 2. Update equipment status_teste
      const { error: updateError } = await supabase
        .from("equipamentos")
        .update({ status_teste: data.resultado })
        .eq("id", data.equipment_id);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test_results"] });
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success("Resultado de teste registrado com sucesso!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao registrar resultado de teste.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("test_results").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["test_results"] }),
    onError: () => toast.error("Erro ao excluir resultado."),
  });

  const addBatchMutation = useMutation({
    mutationFn: async (items: NewTestResult[]) => {
      // 1. Insert results
      const { error: insertError } = await supabase.from("test_results").insert(
        items.map((d) => ({
          equipment_id: d.equipment_id,
          sn: d.sn,
          codigo: d.codigo,
          nome: d.nome,
          resultado: d.resultado,
          observacoes: d.observacoes,
          data_teste: d.data_teste,
          testado_por: d.testado_por,
          destino_reparo: d.destino_reparo || "",
          created_by: user?.email || "",
        }))
      );
      if (insertError) throw insertError;

      // 2. Update equipment statuses (one by one or using a trick, but one by one is safer for simple apps)
      for (const item of items) {
        await supabase
          .from("equipamentos")
          .update({ status_teste: item.resultado })
          .eq("id", item.equipment_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test_results"] });
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success("Resultados importados com sucesso!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao importar resultados.");
    },
  });

  return {
    results,
    isLoading,
    addResult: (data: NewTestResult) => addMutation.mutate(data),
    addBatchResults: (items: NewTestResult[]) => addBatchMutation.mutate(items),
    isBatchLoading: addBatchMutation.isPending,
    deleteResult: (id: string) => deleteMutation.mutate(id),
  };
}
