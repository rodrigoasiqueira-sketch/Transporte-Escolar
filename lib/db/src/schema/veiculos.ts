import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { empresasTable } from "./empresas";

export const veiculosTable = pgTable("veiculos", {
  id: serial("id").primaryKey(),
  prefixo: text("prefixo"),
  tipo: text("tipo"),
  marca: text("marca"),
  modelo: text("modelo").notNull(),
  placa: text("placa").notNull(),
  cor: text("cor"),
  empresaId: integer("empresa_id").references(() => empresasTable.id).notNull(),
  lugares: integer("lugares").default(0),
  situacao: text("situacao"),
  tipoUtilizacao: text("tipo_utilizacao"),
  ano: text("ano"),
  acessibilidade: boolean("acessibilidade").default(false),
});

export const insertVeiculoSchema = createInsertSchema(veiculosTable).omit({ id: true });
export type InsertVeiculo = z.infer<typeof insertVeiculoSchema>;
export type Veiculo = typeof veiculosTable.$inferSelect;
