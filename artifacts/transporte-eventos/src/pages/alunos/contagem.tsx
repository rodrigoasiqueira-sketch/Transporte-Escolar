import React, { useState } from "react";
import { useContagemAlunos, useListEscolas } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calculator } from "lucide-react";

export default function ContagemAlunos() {
  const [escolaId, setEscolaId] = useState<string>("all");
  const [periodo, setPeriodo] = useState<string>("all");
  const [segmento, setSegmento] = useState<string>("all");

  const { data: escolas } = useListEscolas();
  const { data: contagem, isLoading } = useContagemAlunos({
    escola_id: escolaId !== "all" ? Number(escolaId) : undefined,
    periodo: periodo !== "all" ? periodo : undefined,
    segmento: segmento !== "all" ? segmento : undefined,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contagem de Alunos</h1>
          <p className="text-muted-foreground mt-1">Visão agregada por escola, período e segmento</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={escolaId} onValueChange={setEscolaId}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Escola" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as escolas</SelectItem>
                {escolas?.map(e => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="Manhã">Manhã</SelectItem>
                <SelectItem value="Tarde">Tarde</SelectItem>
                <SelectItem value="Integral">Integral</SelectItem>
                <SelectItem value="Noite">Noite</SelectItem>
              </SelectContent>
            </Select>
            <Select value={segmento} onValueChange={setSegmento}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os segmentos</SelectItem>
                <SelectItem value="Infantil">Infantil</SelectItem>
                <SelectItem value="Fundamental">Fundamental</SelectItem>
                <SelectItem value="Multisseriada">Multisseriada</SelectItem>
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
                  <TableHead>Período</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contagem?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  contagem?.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.escola_nome}</TableCell>
                      <TableCell>{row.periodo}</TableCell>
                      <TableCell>{row.segmento}</TableCell>
                      <TableCell>{row.turma}</TableCell>
                      <TableCell className="text-right font-bold">{row.quantidade}</TableCell>
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
