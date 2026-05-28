import React, { useState } from "react";
import { Bus } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AlterarSenha() {
  const { refreshUser } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (senhaNova.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senhaNova !== confirmar) {
      setErro("A confirmação de senha não confere.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ senha_atual: senhaAtual, senha_nova: senhaNova }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Erro ao alterar senha");
        return;
      }
      await refreshUser();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-sidebar-primary">
            <Bus className="h-8 w-8" />
            <span className="text-2xl font-bold text-foreground">Transporte Cultural</span>
          </div>
          <p className="text-sm text-muted-foreground">Prefeitura de Atibaia/SP</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Defina sua senha</CardTitle>
            <CardDescription>
              Este e o seu primeiro acesso. Por seguranca, defina uma senha pessoal antes de continuar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="senha-atual">Senha temporaria</Label>
                <Input
                  id="senha-atual"
                  type="password"
                  placeholder="Senha recebida do administrador"
                  value={senhaAtual}
                  onChange={e => setSenhaAtual(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha-nova">Nova senha</Label>
                <Input
                  id="senha-nova"
                  type="password"
                  placeholder="Minimo 6 caracteres"
                  value={senhaNova}
                  onChange={e => setSenhaNova(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmar">Confirmar nova senha</Label>
                <Input
                  id="confirmar"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  required
                />
              </div>
              {erro && (
                <p className="text-sm text-destructive">{erro}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvando..." : "Definir senha e entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
