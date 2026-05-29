import { pgTable, serial, date, text, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Tipos de eventos permitidos no calendário escolar
 */
export const CALENDAR_EVENT_TYPES = [
  "LETIVO",
  "FERIADO",
  "RECESSO",
  "PONTO_FACULTATIVO",
  "PLANEJAMENTO",
  "CONSELHO_DE_CLASSE",
  "EVENTO_ESCOLAR",
  "REPOSICAO",
  "SUSPENSAO",
] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

/**
 * Tabela: calendario_operacional
 * Armazena informações sobre dias letivos e eventos escolares
 */
export const calendarioOperacionalTable = pgTable("calendario_operacional", {
  id: serial("id").primaryKey(),
  data: date("data").notNull().unique(), // Não permite datas duplicadas
  tipo: varchar("tipo", { length: 30 }).notNull(), // LETIVO, FERIADO, etc
  observacao: text("observacao"), // Descrição do evento
  rede: varchar("rede", { length: 100 }), // Rede escolar (ex: Municipal, Estadual)
  contaTransporte: integer("conta_transporte"), // Se conta para transporte (0 ou 1, ou NULL)
  contaKm: integer("conta_km"), // Se conta para KM (0 ou 1, ou NULL)
  anoLetivo: integer("ano_letivo").notNull(), // Ano letivo (ex: 2024)
  trimestre: integer("trimestre"), // Trimestre (1, 2, 3, 4)
  criadoEm: text("criado_em").notNull(), // ISO timestamp
  atualizadoEm: text("atualizado_em").notNull(), // ISO timestamp
});

/**
 * Schema de inserção para Zod
 */
export const insertCalendarioOperacionalSchema = createInsertSchema(
  calendarioOperacionalTable
).omit({ id: true, criadoEm: true, atualizadoEm: true });

/**
 * Schema de atualização (todos os campos opcionais)
 */
export const updateCalendarioOperacionalSchema = insertCalendarioOperacionalSchema
  .omit({ data: true }) // Data não pode ser alterada após criação
  .partial();

/**
 * Schema para criação via API
 */
export const CreateCalendarioOperacionalSchema = z.object({
  data: z.string().date("Data inválida"),
  tipo: z.enum(CALENDAR_EVENT_TYPES),
  observacao: z.string().optional(),
  rede: z.string().optional(),
  conta_transporte: z.number().int().optional(),
  conta_km: z.number().int().optional(),
  ano_letivo: z.number().int().min(2000).max(2100),
  trimestre: z.number().int().min(1).max(4).optional(),
});

/**
 * Schema para atualização via API
 */
export const UpdateCalendarioOperacionalSchema = z.object({
  tipo: z.enum(CALENDAR_EVENT_TYPES).optional(),
  observacao: z.string().optional(),
  rede: z.string().optional(),
  conta_transporte: z.number().int().optional(),
  conta_km: z.number().int().optional(),
  trimestre: z.number().int().min(1).max(4).optional(),
});

/**
 * Schema para filtros de busca
 */
export const ListCalendarioOperacionalQueryParams = z.object({
  data_inicio: z.string().date().optional(),
  data_fim: z.string().date().optional(),
  tipo: z.enum(CALENDAR_EVENT_TYPES).optional(),
  ano_letivo: z.number().int().optional(),
  rede: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
});

/**
 * Schema para importação em lote
 */
export const BulkImportCalendarioSchema = z.object({
  registros: z.array(CreateCalendarioOperacionalSchema),
});

/**
 * Types TypeScript
 */
export type CalendarioOperacional = typeof calendarioOperacionalTable.$inferSelect;
export type InsertCalendarioOperacional = z.infer<typeof insertCalendarioOperacionalSchema>;
export type UpdateCalendarioOperacional = z.infer<typeof updateCalendarioOperacionalSchema>;
export type CreateCalendarioOperacionalInput = z.infer<typeof CreateCalendarioOperacionalSchema>;
export type UpdateCalendarioOperacionalInput = z.infer<typeof UpdateCalendarioOperacionalSchema>;
export type ListCalendarioOperacionalParams = z.infer<typeof ListCalendarioOperacionalQueryParams>;
