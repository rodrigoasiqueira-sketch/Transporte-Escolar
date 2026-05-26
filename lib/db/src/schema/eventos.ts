import { pgTable, serial, text, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { locaisTable } from "./locais";

export const eventosTable = pgTable("eventos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  data: date("data").notNull(),
  localId: integer("local_id").references(() => locaisTable.id).notNull(),
  observacoes: text("observacoes"),
});

export const sessoesTable = pgTable("sessoes", {
  id: serial("id").primaryKey(),
  eventoId: integer("evento_id").references(() => eventosTable.id, { onDelete: "cascade" }).notNull(),
  nome: text("nome"),
  horarioInicio: text("horario_inicio").notNull(),
  duracaoMinutos: integer("duracao_minutos").notNull(),
});

export const insertEventoSchema = createInsertSchema(eventosTable).omit({ id: true });
export const insertSessaoSchema = createInsertSchema(sessoesTable).omit({ id: true });
export type InsertEvento = z.infer<typeof insertEventoSchema>;
export type InsertSessao = z.infer<typeof insertSessaoSchema>;
export type Evento = typeof eventosTable.$inferSelect;
export type Sessao = typeof sessoesTable.$inferSelect;
