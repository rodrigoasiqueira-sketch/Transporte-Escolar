import React from "react";
import { useListEscolas } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Escolas() {
  const { data: escolas, isLoading } = useListEscolas();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Escolas</h1>
          <p className="text-muted-foreground mt-1">Gerenciamento das unidades escolares</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Escolas</CardTitle>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Num Prodesp</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="text-right">Total Alunos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escolas?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Nenhuma escola cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  escolas?.map((escola) => (
                    <TableRow key={escola.id}>
                      <TableCell className="font-medium">{escola.nome}</TableCell>
                      <TableCell>{escola.num_prodesp || "-"}</TableCell>
                      <TableCell>{escola.cidade || "-"}</TableCell>
                      <TableCell className="text-right">{escola.total_alunos || 0}</TableCell>
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
