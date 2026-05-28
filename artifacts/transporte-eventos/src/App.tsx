import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";
import Login from "@/pages/login";
import AlterarSenha from "@/pages/alterar-senha";

import Dashboard from "@/pages/dashboard";
import Alunos from "@/pages/alunos";
import AlunosContagem from "@/pages/alunos/contagem";
import Escolas from "@/pages/escolas";
import Locais from "@/pages/locais";
import Motoristas from "@/pages/motoristas";
import Empresas from "@/pages/empresas";
import Veiculos from "@/pages/veiculos";
import TemposDeslocamento from "@/pages/tempos-deslocamento";
import Eventos from "@/pages/eventos";
import EventoNovo from "@/pages/eventos/novo";
import EventoDetalhe from "@/pages/eventos/detalhe";
import EventoEscalas from "@/pages/eventos/escalas";
import Usuarios from "@/pages/usuarios";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/alunos" component={Alunos} />
        <Route path="/alunos/contagem" component={AlunosContagem} />
        <Route path="/escolas" component={Escolas} />
        <Route path="/motoristas" component={Motoristas} />
        <Route path="/empresas" component={Empresas} />
        <Route path="/veiculos" component={Veiculos} />
        <Route path="/locais" component={Locais} />
        <Route path="/tempos-deslocamento" component={TemposDeslocamento} />
        <Route path="/eventos" component={Eventos} />
        <Route path="/eventos/novo" component={EventoNovo} />
        <Route path="/eventos/:id" component={EventoDetalhe} />
        <Route path="/eventos/:id/escalas" component={EventoEscalas} />
        <Route path="/usuarios" component={Usuarios} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function AuthGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Login />;
  if (user.primeiro_acesso) return <AlterarSenha />;
  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
