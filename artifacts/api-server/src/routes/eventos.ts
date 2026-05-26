import { Router, type IRouter } from "express";
import { db, eventosTable, sessoesTable, locaisTable, escalasTable, alunosTable, veiculosTable, escolasTable, temposDeslocamentoTable } from "@workspace/db";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import {
  CreateEventoBody, UpdateEventoParams, UpdateEventoBody,
  DeleteEventoParams, GetEventoParams,
  CreateSessaoBody, UpdateSessaoBody,
  ListEventosQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function calcHorarioTermino(inicio: string, duracao: number): string {
  const [h, m] = inicio.split(":").map(Number);
  const totalMin = h * 60 + m + duracao;
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}

function calcPeriodo(inicio: string): string {
  const hora = parseInt(inicio.split(":")[0]);
  if (hora < 12) return "MANHÃ";
  if (hora < 18) return "TARDE";
  return "NOITE";
}

// ── Eventos ─────────────────────────────────────────────────────────────────
router.get("/eventos", async (req, res) => {
  try {
    const params = ListEventosQueryParams.parse(req.query);
    const conditions = [];
    if (params.local_id) conditions.push(eq(eventosTable.localId, params.local_id));
    if (params.data_inicio) conditions.push(gte(eventosTable.data, params.data_inicio));
    if (params.data_fim) conditions.push(lte(eventosTable.data, params.data_fim));

    const eventos = await db.select({
      id: eventosTable.id,
      nome: eventosTable.nome,
      data: eventosTable.data,
      localId: eventosTable.localId,
      localNome: locaisTable.nome,
      observacoes: eventosTable.observacoes,
      totalSessoes: sql<number>`(select count(*) from ${sessoesTable} where ${sessoesTable.eventoId} = ${eventosTable.id})::int`,
    }).from(eventosTable)
      .leftJoin(locaisTable, eq(eventosTable.localId, locaisTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(eventosTable.data);

    res.json(eventos.map(e => ({
      id: e.id, nome: e.nome, data: e.data,
      local_id: e.localId, local_nome: e.localNome,
      observacoes: e.observacoes, total_sessoes: e.totalSessoes,
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing eventos");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/eventos", async (req, res) => {
  try {
    const body = CreateEventoBody.parse(req.body);
    const [evento] = await db.insert(eventosTable).values({
      nome: body.nome,
      data: body.data,
      localId: body.local_id,
      observacoes: body.observacoes ?? null,
    }).returning();
    res.status(201).json({
      id: evento.id, nome: evento.nome, data: evento.data,
      local_id: evento.localId, local_nome: null,
      observacoes: evento.observacoes, total_sessoes: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Error creating evento");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.get("/eventos/:id", async (req, res) => {
  try {
    const { id } = GetEventoParams.parse({ id: Number(req.params.id) });
    const [evento] = await db.select({
      id: eventosTable.id, nome: eventosTable.nome, data: eventosTable.data,
      localId: eventosTable.localId, localNome: locaisTable.nome,
      observacoes: eventosTable.observacoes,
      totalSessoes: sql<number>`(select count(*) from ${sessoesTable} where ${sessoesTable.eventoId} = ${eventosTable.id})::int`,
    }).from(eventosTable)
      .leftJoin(locaisTable, eq(eventosTable.localId, locaisTable.id))
      .where(eq(eventosTable.id, id));
    if (!evento) return res.status(404).json({ error: "Not found" });
    res.json({
      id: evento.id, nome: evento.nome, data: evento.data,
      local_id: evento.localId, local_nome: evento.localNome,
      observacoes: evento.observacoes, total_sessoes: evento.totalSessoes,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting evento");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/eventos/:id", async (req, res) => {
  try {
    const { id } = UpdateEventoParams.parse({ id: Number(req.params.id) });
    const body = UpdateEventoBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.nome !== undefined) updates.nome = body.nome;
    if (body.data !== undefined) updates.data = body.data;
    if (body.local_id !== undefined) updates.localId = body.local_id;
    if (body.observacoes !== undefined) updates.observacoes = body.observacoes;
    const [evento] = await db.update(eventosTable).set(updates).where(eq(eventosTable.id, id)).returning();
    if (!evento) return res.status(404).json({ error: "Not found" });
    res.json({ id: evento.id, nome: evento.nome, data: evento.data, local_id: evento.localId, local_nome: null, observacoes: evento.observacoes, total_sessoes: null });
  } catch (err) {
    req.log.error({ err }, "Error updating evento");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.delete("/eventos/:id", async (req, res) => {
  try {
    const { id } = DeleteEventoParams.parse({ id: Number(req.params.id) });
    await db.delete(eventosTable).where(eq(eventosTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting evento");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/eventos/:id/resumo", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [evento] = await db.select().from(eventosTable).where(eq(eventosTable.id, id));
    if (!evento) return res.status(404).json({ error: "Not found" });

    const sessoes = await db.select().from(sessoesTable).where(eq(sessoesTable.eventoId, id));
    const sessaoIds = sessoes.map(s => s.id);

    const escalas = sessaoIds.length > 0
      ? await db.select({
          sessaoId: escalasTable.sessaoId,
          escolaId: escalasTable.escolaId,
          veiculoId: escalasTable.veiculoId,
          vagasDisponibilizadas: escalasTable.vagasDisponibilizadas,
          periodo: escalasTable.periodo,
          segmentoFiltro: escalasTable.segmentoFiltro,
          turmaFiltro: escalasTable.turmaFiltro,
          veiculoLugares: veiculosTable.lugares,
        }).from(escalasTable)
          .leftJoin(veiculosTable, eq(escalasTable.veiculoId, veiculosTable.id))
          .where(sql`${escalasTable.sessaoId} = ANY(ARRAY[${sql.join(sessaoIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
      : [];

    // Count alunos per escola/periodo/segmento
    const totalAlunos = await db.select({ count: sql<number>`count(*)::int` }).from(alunosTable);
    const totalVagas = escalas.reduce((sum, e) => sum + (e.vagasDisponibilizadas ?? 0), 0);
    const totalVeiculos = new Set(escalas.map(e => e.veiculoId)).size;

    const sessaoResumos = sessoes.map(s => {
      const sesEscalas = escalas.filter(e => e.sessaoId === s.id);
      return {
        sessao_id: s.id,
        nome: s.nome,
        horario_inicio: s.horarioInicio,
        horario_termino: calcHorarioTermino(s.horarioInicio, s.duracaoMinutos),
        total_escalas: sesEscalas.length,
        total_alunos: 0,
        total_vagas: sesEscalas.reduce((sum, e) => sum + (e.vagasDisponibilizadas ?? 0), 0),
      };
    });

    const [localRow] = await db.select().from(locaisTable).where(eq(locaisTable.id, evento.localId));

    res.json({
      evento_id: id,
      evento_nome: evento.nome,
      total_alunos: 0,
      total_vagas: totalVagas,
      vagas_sobra: totalVagas,
      total_veiculos: totalVeiculos,
      sessoes: sessaoResumos,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting evento resumo");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Sessões ──────────────────────────────────────────────────────────────────
router.get("/eventos/:eventoId/sessoes", async (req, res) => {
  try {
    const eventoId = Number(req.params.eventoId);
    const sessoes = await db.select().from(sessoesTable).where(eq(sessoesTable.eventoId, eventoId)).orderBy(sessoesTable.horarioInicio);
    res.json(sessoes.map(s => ({
      id: s.id, evento_id: s.eventoId, nome: s.nome,
      horario_inicio: s.horarioInicio, duracao_minutos: s.duracaoMinutos,
      horario_termino: calcHorarioTermino(s.horarioInicio, s.duracaoMinutos),
      periodo_sessao: calcPeriodo(s.horarioInicio),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing sessoes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/eventos/:eventoId/sessoes", async (req, res) => {
  try {
    const eventoId = Number(req.params.eventoId);
    const body = CreateSessaoBody.parse(req.body);
    const [sessao] = await db.insert(sessoesTable).values({
      eventoId,
      nome: body.nome ?? null,
      horarioInicio: body.horario_inicio,
      duracaoMinutos: body.duracao_minutos,
    }).returning();
    res.status(201).json({
      id: sessao.id, evento_id: sessao.eventoId, nome: sessao.nome,
      horario_inicio: sessao.horarioInicio, duracao_minutos: sessao.duracaoMinutos,
      horario_termino: calcHorarioTermino(sessao.horarioInicio, sessao.duracaoMinutos),
      periodo_sessao: calcPeriodo(sessao.horarioInicio),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating sessao");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.patch("/eventos/:eventoId/sessoes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = UpdateSessaoBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.nome !== undefined) updates.nome = body.nome;
    if (body.horario_inicio !== undefined) updates.horarioInicio = body.horario_inicio;
    if (body.duracao_minutos !== undefined) updates.duracaoMinutos = body.duracao_minutos;
    const [sessao] = await db.update(sessoesTable).set(updates).where(eq(sessoesTable.id, id)).returning();
    if (!sessao) return res.status(404).json({ error: "Not found" });
    res.json({
      id: sessao.id, evento_id: sessao.eventoId, nome: sessao.nome,
      horario_inicio: sessao.horarioInicio, duracao_minutos: sessao.duracaoMinutos,
      horario_termino: calcHorarioTermino(sessao.horarioInicio, sessao.duracaoMinutos),
      periodo_sessao: calcPeriodo(sessao.horarioInicio),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating sessao");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.delete("/eventos/:eventoId/sessoes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(sessoesTable).where(eq(sessoesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting sessao");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
