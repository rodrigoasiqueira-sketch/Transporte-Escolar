import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const escolasTable = pgTable("escolas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  numProdesp: text("num_prodesp"),
  endereco: text("endereco"),
  cidade: text("cidade"),
});

export const insertEscolaSchema = createInsertSchema(escolasTable).omit({ id: true });
export type InsertEscola = z.infer<typeof insertEscolaSchema>;
export type Escola = typeof escolasTable.$inferSelect;
