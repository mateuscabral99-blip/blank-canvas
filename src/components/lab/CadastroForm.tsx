import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Package, Wrench, ShieldCheck, ShieldAlert, AlertTriangle, Download, Upload } from "lucide-react";
import { CadastroModelo } from "@/hooks/useCadastroModelos";
import { useRepairSuppliers, useRepairReturns } from "@/hooks/useRepairSuppliers";
import { cn } from "@/lib/utils";



type NewModelo = Omit<CadastroModelo, "id" | "created_at">;

interface Props {
  modelos: CadastroModelo[];
  onAdd: (data: NewModelo) => void;
  onAddBatch?: (data: NewModelo[]) => void;
  onDelete: (id: string) => void;
  isAdmin?: boolean;
}

function parseLine(line: string): string[] {
  return line.split(/[;,]/).map((v) => v.replace(/^['"]|['"]$/g, "").trim());
}

function normalizeHeaderKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findHeaderIndex(header: string[], aliases: string[]) {
  return header.findIndex((column) => aliases.includes(column));
}

export function CadastroForm({ modelos, onAdd, onAddBatch, onDelete, isAdmin }: Props) {
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Supplier management
  const { suppliers, addSupplier, deleteSupplier } = useRepairSuppliers();
  const { returns } = useRepairReturns();
  const [supplierNome, setSupplierNome] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nome.trim() || !categoria.trim()) {
      toast.error("Preencha código, nome e classificação.");
      return;
    }
    onAdd({
      codigo: codigo.trim(),
      nome: nome.trim(),
      categoria,
      valor_unitario: 0,
    });
    setCodigo("");
    setNome("");
    setCategoria("");
  };

  const handleDownloadCSV = () => {
    const csvContent = "codigo;nome;classificacao\nEX-001;ONT EXEMPLO;ONT WIFI 6\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_cadastro.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV vazio ou sem dados.");
        return;
      }

      const header = parseLine(lines[0]).map(normalizeHeaderKey);
      const codigoIdx = findHeaderIndex(header, ["codigo", "codigo imanager", "codigo i manager", "codigoimanager"]);
      const nomeIdx = findHeaderIndex(header, ["nome"]);
      const classIdx = findHeaderIndex(header, ["classificacao"]);

      const missingColumns: string[] = [];
      if (codigoIdx === -1) missingColumns.push("codigo");
      if (nomeIdx === -1) missingColumns.push("nome");
      if (classIdx === -1) missingColumns.push("classificacao");

      if (missingColumns.length > 0) {
        toast.error(`CSV inválido: faltando coluna(s) ${missingColumns.join(", ")}.`);
        return;
      }

      const batch: NewModelo[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        const nomVal = cols[nomeIdx]?.trim();
        if (!nomVal) continue;

        const codVal = cols[codigoIdx]?.trim() || "";
        const classVal = cols[classIdx]?.trim().toUpperCase() || "";

        batch.push({ codigo: codVal, nome: nomVal, categoria: classVal, valor_unitario: 0 });
      }

      if (batch.length === 0) {
        toast.error("CSV inválido: nenhuma linha válida encontrada com nome preenchido.");
        return;
      }

      if (onAddBatch) {
        onAddBatch(batch);
      } else {
        batch.forEach((m) => onAdd(m));
      }

      toast.success(`${batch.length} modelo(s) importado(s) com sucesso!`);
    };
    reader.readAsText(file, "UTF-8");
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  const handleAddSupplier = () => {
    if (!supplierNome.trim()) {
      toast.error("Preencha o nome do fornecedor.");
      return;
    }
    if (suppliers.some((s) => s.nome.toLowerCase() === supplierNome.trim().toLowerCase())) {
      toast.error("Fornecedor já cadastrado.");
      return;
    }
    addSupplier(supplierNome.trim());
    setSupplierNome("");
  };

  const getHealthScore = (supplierId: string, supplier: typeof suppliers[0]) => {
    const supplierReturns = returns.filter((r) => r.supplier_id === supplierId);
    const retested = supplierReturns.filter((r) => r.encaminhamento === "fila_teste");
    const approvedAfterRetest = retested.filter((r) => r.resultado_amostragem === "aprovado");
    if (retested.length === 0) return supplier.indice_qualidade;
    return Math.round((approvedAfterRetest.length / retested.length) * 100);
  };

  const qualityColor = (score: number) => {
    if (score > 90) return "text-emerald-600";
    if (score > 70) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Modelo form */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Cadastrar Modelo Base
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="codigo">Código I-MANAGER</Label>
                <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código do equipamento" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do modelo" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="categoria">Classificação</Label>
                <Input id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: ONT WIFI 4, SWITCH, etc." />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="submit" size="default" className="gap-1.5">
                <Plus className="h-4 w-4" /> Cadastrar
              </Button>
              <div className="flex items-center gap-2">
                <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                <Button type="button" variant="outline" size="default" onClick={() => csvInputRef.current?.click()} className="gap-1.5">
                  <Upload className="h-4 w-4" /> Importar CSV
                </Button>
                <Button type="button" variant="ghost" size="default" onClick={handleDownloadCSV} className="gap-1.5 text-muted-foreground hover:text-primary">
                  <Download className="h-4 w-4" /> Baixar Modelo CSV
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Modelos table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Modelos Cadastrados ({modelos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {modelos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum modelo cadastrado ainda.</p>
          ) : (
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Classificação</TableHead>
                    {isAdmin && <TableHead className="w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.codigo}</TableCell>
                      <TableCell>{m.nome}</TableCell>
                      <TableCell>
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary/15 text-primary">
                          {m.classificacao || m.categoria}
                        </span>
                      </TableCell>
                      {isAdmin && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(m.id)} className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fornecedores de Reparo */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-600" />
            Fornecedores de Reparo
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Health Score = (Itens Aprovados no Re-teste / Total Re-testados) × 100
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={supplierNome}
              onChange={(e) => setSupplierNome(e.target.value)}
              placeholder="Nome do novo fornecedor"
              className="max-w-sm"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSupplier(); } }}
            />
            <Button type="button" onClick={handleAddSupplier} variant="outline" className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          {suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum fornecedor cadastrado.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-center">Health Score</TableHead>
                    <TableHead className="text-center">Total Reparos</TableHead>
                    <TableHead className="text-center">Falhas</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    {isAdmin && <TableHead className="w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers
                    .sort((a, b) => b.indice_qualidade - a.indice_qualidade)
                    .map((s) => {
                      const score = getHealthScore(s.id, s);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.nome}</TableCell>
                          <TableCell className="text-center">
                            <span className={cn("text-lg font-bold", qualityColor(score))}>
                              {score}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-sm">{s.total_reparos}</TableCell>
                          <TableCell className="text-center text-sm text-red-600 font-semibold">{s.total_falhas}</TableCell>
                          <TableCell className="text-center">
                            {score > 90 ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1" variant="outline">
                                <ShieldCheck className="h-3 w-3" /> Confiável
                              </Badge>
                            ) : score > 70 ? (
                              <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1" variant="outline">
                                <ShieldAlert className="h-3 w-3" /> Atenção
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/15 text-red-700 border-red-500/30 gap-1" variant="outline">
                                <AlertTriangle className="h-3 w-3" /> Crítico
                              </Badge>
                            )}
                          </TableCell>
                          {isAdmin && (
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteSupplier(s.id)} className="h-7 w-7 text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
