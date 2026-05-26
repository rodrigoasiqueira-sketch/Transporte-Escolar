import React from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateEvento, useListLocais, getListEventosQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  data: z.string().min(1, "Data é obrigatória"),
  local_id: z.coerce.number().min(1, "Local é obrigatório"),
  observacoes: z.string().optional(),
});

export default function EventoNovo() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: locais, isLoading: loadingLocais } = useListLocais();
  const createMutation = useCreateEvento();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      data: "",
      observacoes: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const evento = await createMutation.mutateAsync({
        data: values
      });
      
      queryClient.invalidateQueries({ queryKey: getListEventosQueryKey() });
      toast({
        title: "Evento criado",
        description: "O evento foi cadastrado com sucesso."
      });
      setLocation(`/eventos/${evento.id}`);
    } catch (e) {
      toast({
        title: "Erro ao criar",
        description: "Verifique os dados e tente novamente.",
        variant: "destructive"
      });
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Novo Evento</h1>
        <p className="text-muted-foreground mt-1">Cadastrar um novo evento ou passeio</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Evento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Peça Teatral Sítio do Picapau..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="local_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local</FormLabel>
                      <Select 
                        disabled={loadingLocais} 
                        onValueChange={field.onChange} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um local" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locais?.map(local => (
                            <SelectItem key={local.id} value={local.id.toString()}>{local.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Informações adicionais..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setLocation('/eventos')}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Salvar Evento"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
