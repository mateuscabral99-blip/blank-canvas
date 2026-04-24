import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Trash2, Loader2, ShieldCheck, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ManagedUser {
  id: string;
  email: string;
  nome: string;
  ativo: boolean;
  role: string;
  created_at: string;
}

const roleBadge: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  admin: { label: "Admin", className: "bg-red-500/15 text-red-600 border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30", icon: <ShieldCheck className="h-3 w-3" /> },
  supervisor: { label: "Supervisor", className: "bg-amber-500/15 text-amber-600 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30", icon: <Shield className="h-3 w-3" /> },
  operador: { label: "Operador", className: "bg-sky-500/15 text-sky-600 border-sky-300 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30", icon: <User className="h-3 w-3" /> },
};

export function GestaoUsuarios() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("operador");

  const callEdge = useCallback(async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("manage-users", {
      body,
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.error) throw new Error(res.error.message || "Erro na operação");
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await callEdge({ action: "list" });
      setUsers(data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [callEdge]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      await callEdge({ action: "create", nome: nome.trim(), email: email.trim(), password, role });
      toast.success("Usuário criado com sucesso!");
      setNome(""); setEmail(""); setPassword(""); setRole("operador");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: ManagedUser) => {
    try {
      await callEdge({ action: "toggle_status", user_id: user.id, ativo: !user.ativo });
      toast.success(user.ativo ? "Usuário desativado." : "Usuário reativado.");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (user: ManagedUser) => {
    if (!confirm(`Tem certeza que deseja excluir ${user.nome || user.email}? Esta ação é irreversível.`)) return;
    try {
      await callEdge({ action: "delete", user_id: user.id });
      toast.success("Usuário excluído.");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await callEdge({ action: "update_role", user_id: userId, role: newRole });
      toast.success("Nível atualizado.");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const badge = (r: string) => {
    const b = roleBadge[r] || roleBadge.operador;
    return (
      <Badge variant="outline" className={cn("gap-1 text-[10px] font-bold uppercase", b.className)}>
        {b.icon} {b.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* Create form */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Adicionar Novo Colaborador
        </h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nome</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">E-mail</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@empresa.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Senha Inicial</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mín. 6 caracteres" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nível de Acesso</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {submitting ? "Criando..." : "+ Adicionar Usuário"}
          </Button>
        </form>
      </div>

      {/* Users table */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-base font-semibold mb-4">
          Usuários Cadastrados {!loading && `(${users.length})`}
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Select defaultValue={u.role} onValueChange={v => handleRoleChange(u.id, v)}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue>{badge(u.role)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="operador">Operador</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => handleToggleStatus(u)} className="group">
                        <Badge variant="outline" className={cn(
                          "cursor-pointer text-[10px] font-bold uppercase transition-colors",
                          u.ativo
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-red-500/15 hover:text-red-600 hover:border-red-300"
                            : "bg-gray-500/15 text-gray-500 border-gray-300 dark:bg-gray-500/20 dark:text-gray-400 hover:bg-emerald-500/15 hover:text-emerald-600 hover:border-emerald-300"
                        )}>
                          {u.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(u)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
