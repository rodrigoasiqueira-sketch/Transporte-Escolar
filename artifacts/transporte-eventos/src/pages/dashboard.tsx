import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListEventos, useContagemAlunos, useListVeiculos } from "@workspace/api-client-react";
import { CalendarDays, Users, Bus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: eventos, isLoading: loadingEventos } = useListEventos();
  const { data: contagem, isLoading: loadingAlunos } = useContagemAlunos();
  const { data: veiculos, isLoading: loadingVeiculos } = useListVeiculos();

  const totalEventosMes = eventos?.length || 0;
  const totalAlunos = contagem?.reduce((acc, r) => acc + (r.quantidade ?? 0), 0) ?? 0;
  const totalVeiculos = veiculos?.filter(v => v.situacao === 'Ativo').length || 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do sistema de transporte cultural</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos do Mês</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEventos ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{totalEventosMes}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Eventos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingAlunos ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{totalAlunos}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Alunos importados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Veículos Disponíveis</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingVeiculos ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{totalVeiculos}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Veículos ativos na frota</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
