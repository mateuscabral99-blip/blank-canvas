export interface LabItem {
  id: string;
  codigo: string;
  sn: string;
  nome: string;
  categoria: string;
  interesse: boolean;
  origem: string;
  origem_fluxo: "qualidade" | "reversa";
  status_teste: "aprovado" | "reprovado" | "pendente";
  dias_estoque: number;
  valor_estimado: number;
  status_final: string;
  acao_recomendada: string;
  data_entrada: string;
  conferente: string;
  conferido_por: string;
  created_at: string;
}

export type StatusFinal =
  | "Entrada"
  | "Qualidade"
  | "Reversa"
  | "Teste"
  | "Laudo"
  | "Oferta"
  | "Obsoleto"
  | "Crítico";

export type AcaoRecomendada =
  | "depreciar"
  | "ofertar_defeito_pintura"
  | "em_analise"
  | "ofertar_valor_e_quantidade"
  | "prioridade_maxima"
  | "aguardar";

export interface StatusCalculado {
  status_final: StatusFinal;
  acao_recomendada: AcaoRecomendada;
}

export function calcularStatus(item: Pick<LabItem, "interesse" | "origem_fluxo" | "status_teste" | "dias_estoque">): StatusCalculado {
  // Items not of interest go straight to Obsoleto
  if (!item.interesse) {
    return { status_final: "Obsoleto", acao_recomendada: "depreciar" };
  }
  // Critical: over 60 days in stock
  if (item.dias_estoque > 60) {
    return { status_final: "Crítico", acao_recomendada: "prioridade_maxima" };
  }
  // New entries that haven't been tested yet stay as "Entrada"
  if (item.status_teste === "pendente" || !item.status_teste) {
    return { status_final: "Entrada", acao_recomendada: "aguardar" };
  }
  // After testing - failed tests go to Oferta
  if (item.status_teste === "reprovado") {
    return { status_final: "Oferta", acao_recomendada: "ofertar_defeito_pintura" };
  }
  // After testing - approved items go to Teste (Em Análise)
  if (item.status_teste === "aprovado" && item.dias_estoque <= 60) {
    return { status_final: "Teste", acao_recomendada: "em_analise" };
  }
  return { status_final: "Entrada", acao_recomendada: "aguardar" };
}
