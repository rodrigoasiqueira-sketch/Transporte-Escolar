import React, { useState } from "react";
import {
  useListUsuarios,
  useCriarUsuario,
  useResetarSenhaUsuario,
  useDeletarUsuario,
  getListUsuariosQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, KeyRound, UserX } from "lucide-react";

export default function Usuarios() {
  const { user: me } = useAuth();
  const { data: usuarios, isLoading } = useListUsuarios();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const criarMutation = useCriarUsuario();
  const resetarMutation = useResetarSenhaUsuario();
  const deletarMutation = useDeletarUsuario();

  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "operador">("operador");
  const [senhaTemp, setSenhaTemp] = useState<{ nome: string; senha: string } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListUsuariosQueryKey() });

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await criarMutation.mutateAsync({ data: { nome, email, role } });
      setSenhaTemp({ nome: result.nome, senha: result.senha_temporaria ?? "" });
      setShowForm(false);
      setNome(""); setEmail(""); setRole("operador");
      invalidate();
    } catch {
      toast({ title: "Erro ao criar usuario", variant: "destructive" });
    }
  }

  async function handleResetar(id: number, nomeUsuario: string) {
    try {
      const result = await resetarMutation.mutateAsync({ id });
      setSenhaTemp({ nome: nomeUsuario, senha: result.senha_temporaria ?? "" });
      invalidate();
    } catch {
      toast({ title: "Erro ao resetar senha", variant: "destructive" });
    }
  }

  async function handleDesativar(id: number) {
    if (!confirm("Desativar este usuario?")) return;
    try {
      await deletarMutation.mutateAsync({ id });
      invalidate();
      toast({ title: "Usuario desativado" });
    } catch {
      toast({ title: "Erro ao desativar usuario", variant: "destructive" });
    }
  }

  if (me?.role !== "admin") {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground mt-1">Gerencie os acessos ao sistema</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Nome</th>
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 pr-4 font-medium">Perfil</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios?.map(u => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{u.nome}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role === "admin" ? "Admin" : "Operador"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {!u.ativo ? (
                          <Badge variant="destructive">Inativo</Badge>
                        ) : u.primeiro_acesso ? (
                          <Badge variant="outline">Aguardando 1o acesso</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">Ativo</Badge>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetar(u.id, u.nome)}
                            disabled={resetarMutation.isPending}
                            title="Resetar senha"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          {u.id !== me?.id && u.ativo && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDesativar(u.id)}
                              disabled={deletarMutation.isPending}
                              title="Desativar usuario"
                              className="text-destructive hover:text-destructive"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: criar usuario */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriar} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} required placeholder="Nome do funcionario" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@atibaia.sp.gov.br" />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select value={role} onValueChange={v => setRole(v as "admin" | "operador")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={criarMutation.isPending}>
                {criarMutation.isPending ? "Criando..." : "Criar usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: senha temporaria */}
      <Dialog open={!!senhaTemp} onOpenChange={() => setSenhaTemp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha temporaria gerada</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Compartilhe as credenciais abaixo com <strong>{senhaTemp?.nome}</strong>.
              O usuario devera trocar a senha no primeiro acesso.
            </p>
            <div className="bg-muted rounded-md p-3 font-mono text-sm select-all">
              {senhaTemp?.senha}
            </div>
            <p className="text-xs text-muted-foreground">
              Anote a senha agora — ela nao sera exibida novamente.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setSenhaTemp(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
