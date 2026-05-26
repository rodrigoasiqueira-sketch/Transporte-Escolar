import { pgTable, serial, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const empresasTable = pgTable("empresas", {
  id: serial("id").primaryKey(),
  codigo: text("codigo"),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  responsavel: text("responsavel"),
  telefone: text("telefone"),
  email: text("email"),
  modalidade: text("modalidade"),
  ativo: boolean("ativo").default(true),
});

export const insertEmpresaSchema = createInsertSchema(empresasTable).omit({ id: true });
export type InsertEmpresa = z.infer<typeof insertEmpresaSchema>;
export type Empresa = typeof empresasTable.$inferSelect;
