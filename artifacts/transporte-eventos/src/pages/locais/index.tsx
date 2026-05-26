import React from "react";
import { useListLocais } from "@workspace/api-client-react";
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

export default function Locais() {
  const { data: locais, isLoading } = useListLocais();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Locais de Eventos</h1>
          <p className="text-muted-foreground mt-1">Teatros, museus, parques e outros destinos</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Locais</CardTitle>
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
                  <TableHead>Endereço</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locais?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Nenhum local cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  locais?.map((local) => (
                    <TableRow key={local.id}>
                      <TableCell className="font-medium">{local.nome}</TableCell>
                      <TableCell>{local.endereco || "-"}</TableCell>
                      <TableCell>{local.cidade || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={local.observacoes || ""}>
                        {local.observacoes || "-"}
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
