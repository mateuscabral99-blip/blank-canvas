import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Laudo {
  id: string;
  sn: string;
  observacoes: string;
  concluido: boolean;
  causa_reincidencia: string;
  created_at: string;
  updated_at: string;
}

export interface LaudoAttachment {
  id: string;
  laudo_id: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

export function useLaudos() {
  const queryClient = useQueryClient();

  const { data: laudos = [], isLoading } = useQuery({
    queryKey: ["laudos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("laudos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Laudo[];
    },
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["laudo_attachments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("laudo_attachments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LaudoAttachment[];
    },
  });

  const upsertLaudo = useMutation({
    mutationFn: async ({
      sn,
      observacoes,
      concluido,
      causa_reincidencia,
    }: {
      sn: string;
      observacoes?: string;
      concluido?: boolean;
      causa_reincidencia?: string;
    }) => {
      const { data: existing } = await supabase
        .from("laudos")
        .select("id")
        .eq("sn", sn)
        .maybeSingle();

      const updates: {
        observacoes?: string;
        concluido?: boolean;
        causa_reincidencia?: string;
      } = {};
      if (observacoes !== undefined) updates.observacoes = observacoes;
      if (concluido !== undefined) updates.concluido = concluido;
      if (causa_reincidencia !== undefined) updates.causa_reincidencia = causa_reincidencia;

      if (existing) {
        const { error } = await supabase.from("laudos").update(updates).eq("id", existing.id);
        if (error) throw error;
        return existing.id;
      } else {
        const { data, error } = await supabase
          .from("laudos")
          .insert({
            sn,
            observacoes: observacoes || "",
            concluido: concluido || false,
            causa_reincidencia: causa_reincidencia || "",
          })
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laudos"] }),
    onError: () => toast.error("Erro ao salvar laudo."),
  });

  const closeLaudo = useMutation({
    mutationFn: async ({
      sn,
      causa_reincidencia,
      destino,
    }: {
      sn: string;
      causa_reincidencia: string;
      destino: "reparo" | "obsoleto" | "aprovado";
    }) => {
      const { data: existing } = await supabase
        .from("laudos")
        .select("id")
        .eq("sn", sn)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("laudos")
          .update({ concluido: true, causa_reincidencia })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("laudos")
          .insert({ sn, concluido: true, causa_reincidencia, observacoes: "" });
      }

      const statusMap: Record<string, string> = {
        reparo: "Reparo",
        obsoleto: "Obsoleto",
        aprovado: "Aprovado",
      };
      const statusFinal = statusMap[destino] || destino;

      // If approved, register a test result marking it as approved for pipeline
      if (destino === "aprovado") {
        await supabase.from("test_results").insert({
          sn,
          resultado: "Equipamento aprovado",
          observacoes: `Laudo fechado como Aprovado (Sem Defeito) — causa: ${causa_reincidencia}`,
        });
      }

      return { sn, destino: statusFinal };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["laudos"] });
      queryClient.invalidateQueries({ queryKey: ["test_results"] });
      const msg = data.destino === "Aprovado"
        ? `Laudo fechado — SN ${data.sn} aprovado e retornado ao estoque.`
        : `Laudo fechado — SN ${data.sn} encaminhado para ${data.destino}.`;
      toast.success(msg);
    },
    onError: () => toast.error("Erro ao fechar laudo."),
  });

  const uploadAttachment = useMutation({
    mutationFn: async ({ sn, file }: { sn: string; file: File }) => {
      let laudoId: string;
      const { data: existing } = await supabase
        .from("laudos")
        .select("id")
        .eq("sn", sn)
        .maybeSingle();

      if (existing) {
        laudoId = existing.id;
      } else {
        const { data, error } = await supabase
          .from("laudos")
          .insert({ sn, observacoes: "", concluido: false })
          .select("id")
          .single();
        if (error) throw error;
        laudoId = data.id;
      }

      const ext = file.name.split(".").pop();
      const filePath = `${sn}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("laudo-attachments")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("laudo_attachments")
        .insert({ laudo_id: laudoId, file_path: filePath, file_name: file.name });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laudo_attachments"] });
      queryClient.invalidateQueries({ queryKey: ["laudos"] });
      toast.success("Anexo enviado!");
    },
    onError: () => toast.error("Erro ao enviar anexo."),
  });

  const deleteAttachment = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      await supabase.storage.from("laudo-attachments").remove([filePath]);
      const { error } = await supabase.from("laudo_attachments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laudo_attachments"] });
      toast.success("Anexo removido.");
    },
    onError: () => toast.error("Erro ao remover anexo."),
  });

  const getLaudoForSn = (sn: string) => laudos.find((l) => l.sn === sn);
  const getAttachmentsForLaudo = (laudoId: string) => attachments.filter((a) => a.laudo_id === laudoId);

  const getSignedUrl = async (filePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from("laudo-attachments")
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    if (error || !data?.signedUrl) return "";
    return data.signedUrl;
  };

  return {
    laudos,
    attachments,
    isLoading,
    upsertLaudo,
    closeLaudo,
    uploadAttachment,
    deleteAttachment,
    getLaudoForSn,
    getAttachmentsForLaudo,
    getSignedUrl,
  };
}
