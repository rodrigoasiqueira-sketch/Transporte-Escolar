import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const usuariosTable = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  role: text("role").notNull().default("operador"),
  primeiroAcesso: boolean("primeiro_acesso").notNull().default(true),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

export type Usuario = typeof usuariosTable.$inferSelect;
