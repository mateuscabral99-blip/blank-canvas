import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface NewTestResult {
  equipment_id: string;
  sn: string;
  codigo: string;
  nome: string;
  resultado: string;
  observacoes: string;
  data_teste: string;
  testado_por: string;
}

interface Props {
  onImportBatch: (items: NewTestResult[]) => void;
  isLoading?: boolean;
}

function parseLine(line: string): string[] {
  return line.split(/[;,]/).map((v) => v.replace(/^["']|["']$/g, "").trim());
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  return headers.findIndex((h) =>
    candidates.some((c) => h.includes(c))
  );
}

export function ImportTestCSV({ onImportBatch, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();
  const fallbackTecnico = user?.email?.split("@")[0] || "Usuário";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());

      if (lines.length < 2) {
        toast.error("CSV vazio ou sem dados.");
        return;
      }

      const header = parseLine(lines[0]).map(normalizeHeader);

      const snIdx = findHeaderIndex(header, ["sn", "serial"]);
      const resultIdx = findHeaderIndex(header, ["resultado", "status", "conclusao"]);
      const dataIdx = findHeaderIndex(header, ["data teste", "data_teste", "data"]);
      const tecIdx = findHeaderIndex(header, ["tecnico", "testado", "testador"]);
      const obsIdx = findHeaderIndex(header, ["observacao", "obs", "defeito", "motivo", "observacoes"]);

      const missing: string[] = [];
      if (snIdx === -1) missing.push("sn");
      if (resultIdx === -1) missing.push("resultado");

      if (missing.length > 0) {
        toast.error(`CSV inválido: faltando coluna(s) ${missing.join(", ")}.`);
        return;
      }

      // Parse all rows from CSV
      const rows: { sn: string; resultado: string; data_teste: string; tecnico: string; observacoes: string }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        const sn = cols[snIdx]?.trim();
        const resultado = cols[resultIdx]?.trim() || "";
        
        if (!sn || !resultado) continue;
        const tecnico = tecIdx >= 0 ? (cols[tecIdx]?.trim() || "") : "";
        
        // Defect data cleaning (.trim() and .toLowerCase() as requested)
        let observacoes = obsIdx >= 0 ? (cols[obsIdx]?.trim().toLowerCase() || "") : "";

        rows.push({
          sn,
          resultado,
          data_teste: dataIdx >= 0 && cols[dataIdx]?.trim() ? cols[dataIdx].trim() : new Date().toISOString().slice(0, 10),
          tecnico,
          observacoes: observacoes,
        });
      }

      if (rows.length === 0) {
        toast.error("Nenhuma linha válida encontrada no CSV.");
        return;
      }

      // Collect unique SNs and validate against lab_items (entradas)
      const uniqueSns = [...new Set(rows.map((r) => r.sn))];

      const { data: labEntries, error } = await (supabase
        .from("equipamentos") as any)
        .select("sn, codigo, nome")
        .in("sn", uniqueSns);

      if (error) {
        toast.error("Erro ao verificar entradas no banco de dados.");
        console.error(error);
        return;
      }

      // Build lookup map
      const snMap = new Map<string, { codigo: string; nome: string }>();
      (labEntries || []).forEach((entry: any) => {
        snMap.set(entry.sn, { codigo: entry.codigo, nome: entry.nome });
      });

      const batch: NewTestResult[] = [];
      const failedSns: string[] = [];

      for (const row of rows) {
        const entry = snMap.get(row.sn);
        if (!entry) {
          failedSns.push(row.sn);
          continue;
        }
        batch.push({
          sn: row.sn,
          codigo: entry.codigo,
          nome: entry.nome,
          resultado: row.resultado,
          observacoes: row.observacoes,
          data_teste: row.data_teste,
          testado_por: row.tecnico || fallbackTecnico,
        });
      }

      // Show results summary
      if (failedSns.length > 0) {
        const previewSns = failedSns.slice(0, 5).join(", ");
        const extra = failedSns.length > 5 ? ` e mais ${failedSns.length - 5}` : "";
        toast.error(
          `${failedSns.length} SN(s) não registrado(s) na Entrada: ${previewSns}${extra}`,
          { duration: 8000 }
        );
      }

      if (batch.length > 0) {
        onImportBatch(batch);
        toast.success(
          `${batch.length} itens importados${failedSns.length > 0 ? `, ${failedSns.length} falharam por falta de registro de entrada` : ""}.`,
          { duration: 6000 }
        );
      } else if (failedSns.length > 0) {
        toast.error("Nenhum item pôde ser importado — todos os SNs estão sem registro de entrada.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar o arquivo CSV.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const busy = isLoading || processing;

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="gap-1.5" disabled={busy}>
        <Upload className="h-4 w-4" /> {busy ? "Importando..." : "Importar CSV"}
      </Button>
    </>
  );
}
