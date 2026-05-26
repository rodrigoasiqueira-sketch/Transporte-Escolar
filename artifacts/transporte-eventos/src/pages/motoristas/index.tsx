import React, { useState } from "react";
import { useListMotoristas } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Upload } from "lucide-react";

export default function Motoristas() {
  const [search, setSearch] = useState("");
  const { data: motoristas, isLoading } = useListMotoristas();

  const filteredMotoristas = motoristas?.filter(m => 
    m.nome.toLowerCase().includes(search.toLowerCase()) || 
    (m.codigo && m.codigo.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Motoristas</h1>
          <p className="text-muted-foreground mt-1">Gestão de motoristas e ajudantes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Importar Planilha
          </Button>
          <Button>Novo Motorista</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou código..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNH</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMotoristas?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Nenhum motorista encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMotoristas?.map((motorista) => (
                    <TableRow key={motorista.id}>
                      <TableCell className="font-medium">{motorista.codigo || "-"}</TableCell>
                      <TableCell>{motorista.nome}</TableCell>
                      <TableCell>{motorista.empresa_nome || (motorista.eh_proprio ? "Frota Própria" : "-")}</TableCell>
                      <TableCell>
                        {motorista.cnh_categoria ? `${motorista.cnh_categoria}` : "-"}
                      </TableCell>
                      <TableCell>{motorista.telefone || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={motorista.situacao === "Ativo" ? "default" : "secondary"}>
                          {motorista.situacao}
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
