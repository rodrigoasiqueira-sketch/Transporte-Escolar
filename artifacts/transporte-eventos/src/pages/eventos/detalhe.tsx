import React, { useState } from "react";
import { Link, useRoute } from "wouter";
import { useGetEvento, useGetEventoResumo, useListSessoes, useCreateSessao, getListSessoesQueryKey, getGetEventoResumoQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, MapPin, Plus, ArrowRight, Bus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function EventoDetalhe() {
  const [, params] = useRoute("/eventos/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: evento, isLoading: loadingEvento } = useGetEvento(id, {
    query: { enabled: !!id, queryKey: ["getEvento", id] }
  });
  
  const { data: resumo, isLoading: loadingResumo } = useGetEventoResumo(id, {
    query: { enabled: !!id, queryKey: getGetEventoResumoQueryKey(id) }
  });

  const { data: sessoes, isLoading: loadingSessoes } = useListSessoes(id, {
    query: { enabled: !!id, queryKey: getListSessoesQueryKey(id) }
  });

  const createSessaoMutation = useCreateSessao(id);
  const [sessaoNome, setSessaoNome] = useState("");
  const [horarioInicio, setHorarioInicio] = useState("");
  const [duracao, setDuracao] = useState("120");
  const [openNovaSessao, setOpenNovaSessao] = useState(false);

  const handleCriarSessao = async () => {
    try {
      await createSessaoMutation.mutateAsync({
        data: {
          nome: sessaoNome || undefined,
          horario_inicio: horarioInicio,
          duracao_minutos: parseInt(duracao),
        }
      });
      queryClient.invalidateQueries({ queryKey: getListSessoesQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getGetEventoResumoQueryKey(id) });
      setOpenNovaSessao(false);
      setSessaoNome("");
      setHorarioInicio("");
      toast({ title: "Sessão adicionada" });
    } catch (e) {
      toast({ title: "Erro ao criar", variant: "destructive" });
    }
  };

  if (loadingEvento) return <div className="p-8"><Skeleton className="h-64" /></div>;
  if (!evento) return <div className="p-8 text-center">Evento não encontrado</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between gap-6 bg-card border rounded-lg p-6">
        <div>
          <h1 className="text-3xl font-bold">{evento.nome}</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              <span>{format(new Date(evento.data), "dd/MM/yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>{evento.local_nome}</span>
            </div>
          </div>
          {evento.observacoes && (
            <p className="mt-4 text-sm bg-muted/50 p-3 rounded">{evento.observacoes}</p>
          )}
        </div>
        <div className="flex items-start">
          <Button asChild>
            <Link href={`/eventos/${id}/escalas`}>
              <Bus className="w-4 h-4 mr-2" />
              Gerenciar Escalas
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Sessões</h2>
            <Dialog open={openNovaSessao} onOpenChange={setOpenNovaSessao}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Nova Sessão</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Sessão</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome (Opcional)</Label>
                    <Input value={sessaoNome} onChange={e => setSessaoNome(e.target.value)} placeholder="Ex: Sessão da Manhã" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Horário Início</Label>
                      <Input type="time" value={horarioInicio} onChange={e => setHorarioInicio(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Duração (min)</Label>
                      <Input type="number" value={duracao} onChange={e => setDuracao(e.target.value)} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCriarSessao} disabled={!horarioInicio || createSessaoMutation.isPending}>
                    Confirmar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {loadingSessoes ? <Skeleton className="h-32" /> : sessoes?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border rounded-lg bg-card">
                Nenhuma sessão cadastrada para este evento.
              </div>
            ) : (
              sessoes?.map(sessao => (
                <Card key={sessao.id}>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">{sessao.nome || "Sessão"}</CardTitle>
                    <span className="text-sm px-2 py-1 bg-primary/10 text-primary rounded-md font-medium">
                      {sessao.periodo_sessao}
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-lg">
                      <span className="font-mono bg-muted px-2 py-1 rounded">{sessao.horario_inicio.slice(0, 5)}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono bg-muted px-2 py-1 rounded">{sessao.horario_termino?.slice(0, 5)}</span>
                      <span className="text-sm text-muted-foreground ml-2">({sessao.duracao_minutos} min)</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Resumo</h2>
          {loadingResumo ? <Skeleton className="h-64" /> : resumo ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total de Alunos</div>
                  <div className="text-3xl font-bold">{resumo.total_alunos}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Vagas em Veículos</div>
                  <div className="text-2xl font-bold">{resumo.total_vagas}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Vagas Sobrando (Acompanhantes)</div>
                  <div className={`text-2xl font-bold ${resumo.vagas_sobra < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {resumo.vagas_sobra}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Veículos Alocados</div>
                  <div className="text-2xl font-bold">{resumo.total_veiculos}</div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
