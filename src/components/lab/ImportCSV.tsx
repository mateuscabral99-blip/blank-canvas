import { useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { LabItem } from "@/types/LabItem";
import { supabase } from "@/integrations/supabase/client";

type NewItem = Omit<LabItem, "id" | "status_final" | "acao_recomendada" | "created_at">;

interface Props {
  onImportBatch: (items: NewItem[]) => void;
  isLoading?: boolean;
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Detect delimiter from header line — supports both ',' and ';' but respects quoted fields
function detectDelimiter(sample: string): "," | ";" {
  // Strip quoted segments before counting so commas inside "Roteador, WiFi 6" don't skew detection
  const stripped = sample.replace(/"([^"]|"")*"/g, "");
  const semicolons = (stripped.match(/;/g) || []).length;
  const commas = (stripped.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function mapOrigem(value: string): string {
  const normalized = normalizeText(value);
  if (normalized.includes("reversa")) return "Reversa";
  if (normalized.includes("qualidade") || normalized.includes("desconex")) return "Desconexão";
  return "Desconexão";
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  return headers.findIndex((h) => candidates.some((c) => h.includes(c)));
}

export function ImportCSV({ onImportBatch, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();

    // Detect delimiter (',' or ';') while respecting quoted fields, then parse with PapaParse
    // for proper RFC 4180 handling — quoted fields can contain commas, semicolons, dashes, etc.
    const firstLineRaw = text.split(/\r?\n/, 1)[0] || "";
    const delimiter = detectDelimiter(firstLineRaw);

    const parsed = Papa.parse<string[]>(text, {
      delimiter,
      skipEmptyLines: "greedy",
    });

    if (parsed.errors && parsed.errors.length > 0) {
      const firstErr = parsed.errors[0];
      toast.error(`Erro ao ler CSV: ${firstErr.message} (linha ${(firstErr.row ?? 0) + 1})`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const rows = parsed.data.filter(
      (r) => Array.isArray(r) && r.some((c) => (c ?? "").toString().trim() !== "")
    );
    if (rows.length < 2) {
      toast.error("CSV vazio ou sem dados.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const header = rows[0].map((h) => normalizeText(h ?? ""));

    const codigoIdx = findHeaderIndex(header, ["codigo", "i-manager", "imanager", "codigo_imanager", "codigo imanager"]);
    const snIdx = findHeaderIndex(header, ["sn", "serial", "serial_number"]);
    const nomeIdx = findHeaderIndex(header, ["nome", "item_nome", "nome_item"]);
    const catIdx = findHeaderIndex(header, ["categoria"]);
    const destIdx = findHeaderIndex(header, ["destinacao", "destino"]);
    const intIdx = findHeaderIndex(header, ["interesse"]);
    const origemIdx = findHeaderIndex(header, ["origem"]);
    const confIdx = findHeaderIndex(header, ["conferido", "conferente"]);
    const dataIdx = findHeaderIndex(header, ["data"]);
    const classIdx = findHeaderIndex(header, ["classificacao", "classificação", "modelo"]);

    const missingCols: string[] = [];
    if (codigoIdx === -1) missingCols.push("Codigo");
    if (origemIdx === -1) missingCols.push("Origem");
    if (missingCols.length > 0) {
      toast.error(`CSV deve conter as colunas obrigatórias: ${missingCols.join(", ")}.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Collect unique códigos to lookup in cadastro_modelos
    const codigosSet = new Set<string>();
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      const cod = codigoIdx >= 0 ? (cols[codigoIdx] ?? "").toString().trim() : "";
      if (cod) codigosSet.add(cod);
    }

    // Fetch matching models from database
    const modelosMap = new Map<string, { nome: string; classificacao: string }>();
    if (codigosSet.size > 0) {
      const { data: modelos } = await supabase
        .from("cadastro_modelos")
        .select("codigo, nome, classificacao")
        .in("codigo", Array.from(codigosSet));

      if (modelos) {
        for (const m of modelos) {
          modelosMap.set(m.codigo, { nome: m.nome, classificacao: m.classificacao });
        }
      }
    }

    const warnings: string[] = [];
    const batch: NewItem[] = [];

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].map((c) => (c ?? "").toString());

      const origemVal = mapOrigem(cols[origemIdx] || "");
      if (!origemVal) {
        toast.error(`Linha ${i + 1}: informe uma Origem válida (Reversa ou Desconexão).`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      const codigoVal = codigoIdx >= 0 ? (cols[codigoIdx]?.trim() || "") : "";
      if (!codigoVal) {
        toast.error(`Linha ${i + 1}: Código é obrigatório.`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      const lookup = modelosMap.get(codigoVal);
      if (!lookup) {
        toast.error(`Código ${codigoVal} não encontrado no cadastro de modelos`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      // Nome: lookup (auto-enriched) > CSV fallback
      let nomeVal = lookup.nome;
      if (!nomeVal && nomeIdx >= 0) nomeVal = cols[nomeIdx]?.trim() || "";

      // Classificação: lookup (auto-enriched) > CSV fallback
      let classVal = lookup.classificacao;
      if (!classVal && classIdx >= 0) classVal = cols[classIdx]?.trim() || "";

      // Categoria (Interesse / Não Interesse)
      const categoriaRaw = catIdx >= 0 ? (cols[catIdx] || "Interesse") : "Interesse";
      const categoriaNormalizada = normalizeText(categoriaRaw).replace(/\s+/g, " ");
      const categoria = categoriaNormalizada.includes("nao interesse") ? "Não Interesse" : "Interesse";

      let interesse: boolean;
      if (catIdx >= 0) {
        interesse = categoria === "Interesse";
      } else if (destIdx >= 0) {
        const destinoNormalizado = normalizeText(cols[destIdx] || "");
        interesse = !destinoNormalizado.includes("obsoleto");
      } else if (intIdx >= 0) {
        const interesseRaw = normalizeText(cols[intIdx] || "");
        interesse = ["sim", "true", "1", "s", "interesse"].includes(interesseRaw);
      } else {
        interesse = true;
      }

      const snVal = snIdx >= 0 ? (cols[snIdx]?.trim() || "") : "";
      const conferente = confIdx >= 0 ? (cols[confIdx]?.trim() || "") : "";
      const data_entrada = dataIdx >= 0 && cols[dataIdx] ? cols[dataIdx].trim() : new Date().toISOString().slice(0, 10);

      batch.push({
        codigo: codigoVal,
        modelo: classVal,
        sn: snVal,
        nome: nomeVal,
        categoria,
        interesse,
        origem: cols[origemIdx]?.trim() || "",
        origem_fluxo: origemFluxo,
        status_teste: "pendente",
        dias_estoque: 0,
        valor_estimado: 0,
        data_entrada,
        conferente,
      });
    }

    if (batch.length === 0) {
      toast.error("Nenhum item válido encontrado no CSV.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (warnings.length > 0) {
      warnings.forEach((w) => toast.warning(w));
    }

    const enriched = batch.filter((b) => modelosMap.has(b.codigo));
    if (enriched.length > 0) {
      toast.info(`${enriched.length} item(ns) enriquecido(s) automaticamente pelo cadastro de modelos.`);
    }

    onImportBatch(batch);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => inputRef.current?.click()}
        className="h-8 gap-1.5 text-xs hover:bg-background"
        disabled={isLoading}
      >
        <Upload className="h-3.5 w-3.5" />
        {isLoading ? "Importando..." : "Importar CSV"}
      </Button>
    </>
  );
}
