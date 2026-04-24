import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CadastroModelo {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  classificacao?: string;
  valor_unitario: number;
  created_at: string;
}

type NewModelo = Omit<CadastroModelo, "id" | "created_at">;

export function useCadastroModelos() {
  const queryClient = useQueryClient();

  const { data: modelos = [], isLoading } = useQuery({
    queryKey: ["cadastro_modelos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cadastro_modelos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as CadastroModelo[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: NewModelo) => {
      const { error } = await supabase.from("cadastro_modelos").insert({
        codigo: data.codigo,
        nome: data.nome,
        categoria: data.categoria,
        classificacao: data.categoria, // Duplicate for consistency
        valor_unitario: data.valor_unitario,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastro_modelos"] });
      toast.success("Modelo cadastrado com sucesso!");
    },
    onError: () => toast.error("Erro ao cadastrar modelo."),
  });

  const addBatchMutation = useMutation({
    mutationFn: async (items: NewModelo[]) => {
      const { error } = await supabase.from("cadastro_modelos").insert(
        items.map((d) => ({
          codigo: d.codigo,
          nome: d.nome,
          categoria: d.categoria,
          classificacao: d.categoria,
          valor_unitario: d.valor_unitario,
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastro_modelos"] });
    },
    onError: (error: Error) => toast.error(error.message || "Erro ao importar modelos."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cadastro_modelos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadastro_modelos"] });
      toast.success("Modelo excluído.");
    },
    onError: () => toast.error("Erro ao excluir modelo."),
  });

  return {
    modelos,
    isLoading,
    addModelo: (data: NewModelo) => addMutation.mutate(data),
    addBatchModelos: (data: NewModelo[]) => addBatchMutation.mutate(data),
    deleteModelo: (id: string) => deleteMutation.mutate(id),
  };
}
