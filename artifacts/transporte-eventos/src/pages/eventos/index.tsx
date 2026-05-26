import React from "react";
import { Link } from "wouter";
import { useListEventos } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { format } from "date-fns";

export default function Eventos() {
  const { data: eventos, isLoading } = useListEventos();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Eventos</h1>
          <p className="text-muted-foreground mt-1">Gerencie passeios e eventos culturais</p>
        </div>
        <Button asChild>
          <Link href="/eventos/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : eventos?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <CardTitle className="mb-2">Nenhum evento</CardTitle>
          <p className="text-muted-foreground">Comece criando o primeiro evento no botão acima.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventos?.map((evento) => (
            <Link key={evento.id} href={`/eventos/${evento.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col hover-elevate">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-2" title={evento.nome}>
                    {evento.nome}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      <span>{format(new Date(evento.data), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{evento.local_nome}</span>
                    </div>
                    <div className="pt-2 mt-2 border-t font-medium text-foreground">
                      {evento.total_sessoes} sessões cadastradas
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
