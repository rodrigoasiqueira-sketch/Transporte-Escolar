import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessoesTable } from "./eventos";
import { escolasTable } from "./escolas";
import { veiculosTable } from "./veiculos";
import { motoristasTable } from "./motoristas";

export const escalasTable = pgTable("escalas", {
  id: serial("id").primaryKey(),
  sessaoId: integer("sessao_id").references(() => sessoesTable.id, { onDelete: "cascade" }).notNull(),
  escolaId: integer("escola_id").references(() => escolasTable.id).notNull(),
  veiculoId: integer("veiculo_id").references(() => veiculosTable.id).notNull(),
  motoristaId: integer("motorista_id").references(() => motoristasTable.id),
  vagasDisponibilizadas: integer("vagas_disponibilizadas").default(0),
  periodo: text("periodo"),
  segmentoFiltro: text("segmento_filtro"),
  turmaFiltro: text("turma_filtro"),
});

export const insertEscalaSchema = createInsertSchema(escalasTable).omit({ id: true });
export type InsertEscala = z.infer<typeof insertEscalaSchema>;
export type Escala = typeof escalasTable.$inferSelect;
