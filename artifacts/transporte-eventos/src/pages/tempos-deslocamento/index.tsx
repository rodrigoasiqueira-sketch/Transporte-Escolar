import React, { useState } from "react";
import { useListTemposDeslocamento, useListEscolas, useListLocais, useUpsertTempoDeslocamento, getListTemposDeslocamentoQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock } from "lucide-react";

export default function TemposDeslocamento() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [escolaId, setEscolaId] = useState<string>("all");
  const [localId, setLocalId] = useState<string>("all");

  const { data: tempos, isLoading } = useListTemposDeslocamento({
    escola_id: escolaId !== "all" ? Number(escolaId) : undefined,
    local_id: localId !== "all" ? Number(localId) : undefined,
  });
  
  const { data: escolas } = useListEscolas();
  const { data: locais } = useListLocais();
  
  const upsertMutation = useUpsertTempoDeslocamento();

  const handleUpdateTempo = async (tEscolaId: number, tLocalId: number, minutos: number) => {
    try {
      await upsertMutation.mutateAsync({
        data: {
          escola_id: tEscolaId,
          local_id: tLocalId,
          minutos
        }
      });
      queryClient.invalidateQueries({ queryKey: getListTemposDeslocamentoQueryKey() });
      toast({
        title: "Tempo atualizado",
        description: `Tempo de deslocamento atualizado para ${minutos} minutos.`
      });
    } catch (e) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o tempo de deslocamento.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tempos de Deslocamento</h1>
          <p className="text-muted-foreground mt-1">Matriz de tempo entre escolas e locais de evento</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={escolaId} onValueChange={setEscolaId}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Filtrar Escola" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as escolas</SelectItem>
                {escolas?.map(e => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={localId} onValueChange={setLocalId}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Filtrar Local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os locais</SelectItem>
                {locais?.map(l => (
                  <SelectItem key={l.id} value={l.id.toString()}>{l.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
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
                  <TableHead>Local do Evento</TableHead>
                  <TableHead className="w-[150px]">Tempo (min)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tempos?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                      Nenhum tempo de deslocamento cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  tempos?.map((tempo) => (
                    <TableRow key={tempo.id}>
                      <TableCell className="font-medium">{tempo.escola_nome}</TableCell>
                      <TableCell>{tempo.local_nome}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            defaultValue={tempo.minutos}
                            className="w-20"
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val !== tempo.minutos) {
                                handleUpdateTempo(tempo.escola_id, tempo.local_id, val);
                              }
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
