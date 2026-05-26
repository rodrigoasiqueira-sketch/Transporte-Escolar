import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";

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

const queryClient = new QueryClient();

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
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
