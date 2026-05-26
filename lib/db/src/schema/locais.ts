import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const locaisTable = pgTable("locais_eventos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  endereco: text("endereco"),
  cidade: text("cidade"),
  observacoes: text("observacoes"),
});

export const insertLocalSchema = createInsertSchema(locaisTable).omit({ id: true });
export type InsertLocal = z.infer<typeof insertLocalSchema>;
export type Local = typeof locaisTable.$inferSelect;
