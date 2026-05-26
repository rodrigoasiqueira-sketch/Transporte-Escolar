import React, { useState } from "react";
import { useListAlunos, useImportAlunos } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Alunos() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState<string>("all");
  const [segmento, setSegmento] = useState<string>("all");

  const { data: alunos, isLoading, refetch } = useListAlunos({
    search: search || undefined,
    periodo: periodo !== "all" ? periodo : undefined,
    segmento: segmento !== "all" ? segmento : undefined,
  });

  const importMutation = useImportAlunos();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      // Convert to base64
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      const base64string = window.btoa(binary);

      try {
        const result = await importMutation.mutateAsync({ data: { fileBase64: base64string } });
        toast({
          title: "Importação concluída",
          description: `Total: ${result.total}. Importados: ${result.importados}. Ignorados: ${result.ignorados}. Erros: ${result.erros.length}`,
        });
        refetch();
      } catch (error) {
        toast({
          title: "Erro na importação",
          description: "Ocorreu um erro ao importar a planilha.",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Alunos</h1>
          <p className="text-muted-foreground mt-1">Gerenciamento da base de alunos</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <Input type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} disabled={importMutation.isPending} />
            <Button variant="outline" asChild disabled={importMutation.isPending}>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {importMutation.isPending ? "Importando..." : "Importar Planilha"}
              </span>
            </Button>
          </label>
          <Button>Novo Aluno</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou RA..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
                  <TableHead>RA</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Escola</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Segmento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alunos?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Nenhum aluno encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  alunos?.map((aluno) => (
                    <TableRow key={aluno.id}>
                      <TableCell className="font-medium">{aluno.ra}</TableCell>
                      <TableCell>{aluno.nome}</TableCell>
                      <TableCell>{aluno.escola_nome}</TableCell>
                      <TableCell>{aluno.turma}</TableCell>
                      <TableCell>{aluno.periodo}</TableCell>
                      <TableCell>{aluno.segmento}</TableCell>
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
