import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import { 
  useListEscalas, 
  useGetEvento, 
  useListSessoes, 
  useListEscolas, 
  useListVeiculos,
  useListMotoristas,
  useCreateEscala,
  getListEscalasQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EventoEscalas() {
  const [, params] = useRoute("/eventos/:id/escalas");
  const eventoId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sessaoId, setSessaoId] = useState<string>("all");
  const [openNovaEscala, setOpenNovaEscala] = useState(false);

  // Form states
  const [fSessaoId, setFSessaoId] = useState("");
  const [fEscolaId, setFEscolaId] = useState("");
  const [fVeiculoId, setFVeiculoId] = useState("");
  const [fMotoristaId, setFMotoristaId] = useState("");
  const [fVagas, setFVagas] = useState("");

  const { data: evento } = useGetEvento(eventoId, { query: { enabled: !!eventoId, queryKey: ["getEvento", eventoId] } });
  const { data: sessoes } = useListSessoes(eventoId, { query: { enabled: !!eventoId, queryKey: ["getSessoes", eventoId] } });
  const { data: escalas, isLoading } = useListEscalas({
    evento_id: eventoId,
    sessao_id: sessaoId !== "all" ? Number(sessaoId) : undefined
  }, { query: { enabled: !!eventoId, queryKey: getListEscalasQueryKey({ evento_id: eventoId }) } });

  const { data: escolas } = useListEscolas();
  const { data: veiculos } = useListVeiculos({ situacao: "Ativo" });
  const { data: motoristas } = useListMotoristas({ situacao: "Ativo" });

  const createEscala = useCreateEscala();

  const handleCriarEscala = async () => {
    try {
      await createEscala.mutateAsync({
        data: {
          sessao_id: parseInt(fSessaoId),
          escola_id: parseInt(fEscolaId),
          veiculo_id: parseInt(fVeiculoId),
          motorista_id: fMotoristaId ? parseInt(fMotoristaId) : undefined,
          vagas_disponibilizadas: fVagas ? parseInt(fVagas) : undefined,
        }
      });
      queryClient.invalidateQueries({ queryKey: getListEscalasQueryKey({ evento_id: eventoId }) });
      setOpenNovaEscala(false);
      toast({ title: "Escala adicionada" });
    } catch (e) {
      toast({ title: "Erro ao adicionar", variant: "destructive" });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/eventos/${eventoId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Escalas de Transporte</h1>
          <p className="text-muted-foreground">{evento?.nome}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <Select value={sessaoId} onValueChange={setSessaoId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Filtrar por sessão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as sessões</SelectItem>
                {sessoes?.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.nome || "Sessão"} ({s.horario_inicio.slice(0,5)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={openNovaEscala} onOpenChange={setOpenNovaEscala}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Adicionar Escala</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nova Escala</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Sessão</Label>
                    <Select value={fSessaoId} onValueChange={setFSessaoId}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {sessoes?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.nome || s.horario_inicio.slice(0,5)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Escola</Label>
                    <Select value={fEscolaId} onValueChange={setFEscolaId}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {escolas?.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Veículo</Label>
                    <Select value={fVeiculoId} onValueChange={setFVeiculoId}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {veiculos?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.placa} - {v.modelo} ({v.lugares} lug)</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Motorista (Opcional)</Label>
                    <Select value={fMotoristaId} onValueChange={setFMotoristaId}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {motoristas?.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vagas Disponibilizadas</Label>
                    <Input type="number" value={fVagas} onChange={e => setFVagas(e.target.value)} placeholder="Deixe em branco para usar limite do veículo" />
                  </div>
                  <Button className="w-full" onClick={handleCriarEscala} disabled={!fSessaoId || !fEscolaId || !fVeiculoId || createEscala.isPending}>
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Escola</TableHead>
                  <TableHead>Sessão</TableHead>
                  <TableHead>Embarque</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead className="text-right">Vagas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalas?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Nenhuma escala definida
                    </TableCell>
                  </TableRow>
                ) : (
                  escalas?.map(escala => {
                    const sessao = sessoes?.find(s => s.id === escala.sessao_id);
                    return (
                      <TableRow key={escala.id}>
                        <TableCell className="font-medium">{escala.escola_nome}</TableCell>
                        <TableCell>{sessao?.nome || sessao?.horario_inicio.slice(0,5)}</TableCell>
                        <TableCell className="font-mono">{escala.horario_embarque?.slice(0,5) || "-"}</TableCell>
                        <TableCell>{escala.veiculo_placa}</TableCell>
                        <TableCell>{escala.motorista_nome || "-"}</TableCell>
                        <TableCell className="text-right font-medium">{escala.vagas_disponibilizadas || "-"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
