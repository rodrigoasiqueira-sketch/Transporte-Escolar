import { pgTable, serial, text, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { empresasTable } from "./empresas";

export const motoristasTable = pgTable("motoristas", {
  id: serial("id").primaryKey(),
  codigo: text("codigo"),
  nome: text("nome").notNull(),
  funcao: text("funcao"),
  telefone: text("telefone"),
  situacao: text("situacao").default("Ativo"),
  cnhCategoria: text("cnh_categoria"),
  cnhVencimento: text("cnh_vencimento"),
  empresaId: integer("empresa_id").references(() => empresasTable.id),
  ehProprio: boolean("eh_proprio").default(true),
});

export const insertMotoristaSchema = createInsertSchema(motoristasTable).omit({ id: true });
export type InsertMotorista = z.infer<typeof insertMotoristaSchema>;
export type Motorista = typeof motoristasTable.$inferSelect;
