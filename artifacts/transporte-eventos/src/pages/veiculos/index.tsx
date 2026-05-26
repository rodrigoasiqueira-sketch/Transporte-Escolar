import React, { useState, useRef } from "react";
import { useListVeiculos, useImportVeiculos, getListVeiculosQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Veiculos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  const { data: veiculos, isLoading } = useListVeiculos();
  const importMutation = useImportVeiculos();

  const filteredVeiculos = veiculos?.filter(v =>
    v.placa.toLowerCase().includes(search.toLowerCase()) ||
    (v.prefixo && v.prefixo.toLowerCase().includes(search.toLowerCase())) ||
    v.modelo.toLowerCase().includes(search.toLowerCase())
  );

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const arrayBuffer = evt.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const fileBase64 = window.btoa(binary);

      try {
        const result = await importMutation.mutateAsync({ data: { fileBase64 } });
        toast({
          title: "Importação concluída",
          description: `Importados: ${result.importados} | Ignorados: ${result.ignorados} | Erros: ${result.erros.length}`,
        });
        queryClient.invalidateQueries({ queryKey: getListVeiculosQueryKey() });
      } catch {
        toast({ title: "Erro na importação", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Veículos</h1>
          <p className="text-muted-foreground mt-1">Frota de transporte disponível</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportClick} disabled={importMutation.isPending}>
            <Upload className="w-4 h-4 mr-2" />
            {importMutation.isPending ? "Importando..." : "Importar Planilha"}
          </Button>
          <Button>Novo Veículo</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa, prefixo ou modelo..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Lugares</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredVeiculos?.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum veículo encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVeiculos.map((veiculo) => (
                    <TableRow key={veiculo.id}>
                      <TableCell className="font-medium">{veiculo.prefixo || "-"}</TableCell>
                      <TableCell className="font-mono">{veiculo.placa}</TableCell>
                      <TableCell>{veiculo.modelo}</TableCell>
                      <TableCell>{veiculo.empresa_nome || "-"}</TableCell>
                      <TableCell className="text-right">{veiculo.lugares}</TableCell>
                      <TableCell>
                        <Badge variant={veiculo.situacao === "Ativo" ? "default" : "secondary"}>
                          {veiculo.situacao || "Desconhecido"}
                        </Badge>
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
