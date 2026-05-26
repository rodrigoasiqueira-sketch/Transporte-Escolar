import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { escolasTable } from "./escolas";

export const alunosTable = pgTable("alunos", {
  id: serial("id").primaryKey(),
  ra: text("ra").notNull().unique(),
  nome: text("nome").notNull(),
  escolaId: integer("escola_id").references(() => escolasTable.id),
  turma: text("turma"),
  classe: text("classe"),
  periodo: text("periodo"),
  segmento: text("segmento"),
  sexo: text("sexo"),
  nascimento: text("nascimento"),
  situacaoMatricula: text("situacao_matricula"),
  zona: text("zona"),
  frota: text("frota"),
});

export const insertAlunoSchema = createInsertSchema(alunosTable).omit({ id: true });
export type InsertAluno = z.infer<typeof insertAlunoSchema>;
export type Aluno = typeof alunosTable.$inferSelect;
