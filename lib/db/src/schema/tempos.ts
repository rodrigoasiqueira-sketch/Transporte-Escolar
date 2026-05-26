import { pgTable, serial, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { escolasTable } from "./escolas";
import { locaisTable } from "./locais";

export const temposDeslocamentoTable = pgTable("tempos_deslocamento", {
  id: serial("id").primaryKey(),
  escolaId: integer("escola_id").references(() => escolasTable.id).notNull(),
  localId: integer("local_id").references(() => locaisTable.id).notNull(),
  minutos: integer("minutos").notNull(),
}, (t) => [unique().on(t.escolaId, t.localId)]);

export const insertTempoDeslocamentoSchema = createInsertSchema(temposDeslocamentoTable).omit({ id: true });
export type InsertTempoDeslocamento = z.infer<typeof insertTempoDeslocamentoSchema>;
export type TempoDeslocamento = typeof temposDeslocamentoTable.$inferSelect;
