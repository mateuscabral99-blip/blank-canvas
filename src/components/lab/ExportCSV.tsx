import { LabItem } from "@/types/LabItem";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

function getDestino(categoria: string, interesse: boolean) {
  const categoriaNormalizada = categoria
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (categoriaNormalizada?.includes("nao interesse")) return "Obsoletos";
  if (categoriaNormalizada?.includes("interesse")) return "Teste";
  return interesse ? "Teste" : "Obsoletos";
}

interface Props {
  items: LabItem[];
}

export function ExportCSV({ items }: Props) {
  const handleExport = () => {
    if (items.length === 0) {
      toast.error("Nenhum item para exportar.");
      return;
    }

    const headers = ["Código I-MANAGER", "Nome", "Categoria", "Destino", "Status Teste", "Dias Estoque", "Status Final", "Ação Recomendada", "Conferente", "Data Entrada", "Data Cadastro"];
    const rows = items.map((i) => [
      i.codigo,
      i.nome,
      i.categoria,
      getDestino(i.categoria, i.interesse),
      i.status_teste,
      i.dias_estoque,
      i.status_final,
      i.acao_recomendada,
      i.conferente,
      i.data_entrada,
      new Date(i.created_at).toLocaleDateString("pt-BR"),
    ]);

    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lab_items_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
      <Download className="h-4 w-4" /> Exportar CSV
    </Button>
  );
}
