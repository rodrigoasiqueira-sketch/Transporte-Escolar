import { Router, type IRouter } from "express";
import { db, escalasTable, sessoesTable, escolasTable, veiculosTable, motoristasTable, alunosTable, temposDeslocamentoTable, eventosTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateEscalaBody, UpdateEscalaParams, UpdateEscalaBody,
  DeleteEscalaParams, GetEscalaParams, ListEscalasQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function subHorario(inicio: string, minutos: number): string {
  const [h, m] = inicio.split(":").map(Number);
  const total = h * 60 + m - minutos;
  const finalTotal = total < 0 ? 0 : total;
  return `${String(Math.floor(finalTotal / 60)).padStart(2, "0")}:${String(finalTotal % 60).padStart(2, "0")}`;
}

async function enrichEscala(e: typeof escalasTable.$inferSelect) {
  const [escola] = await db.select().from(escolasTable).where(eq(escolasTable.id, e.escolaId));
  const [veiculo] = await db.select().from(veiculosTable).where(eq(veiculosTable.id, e.veiculoId));
  const motorista = e.motoristaId
    ? (await db.select().from(motoristasTable).where(eq(motoristasTable.id, e.motoristaId)))[0]
    : null;
  const [sessao] = await db.select().from(sessoesTable).where(eq(sessoesTable.id, e.sessaoId));

  // Get travel time
  let horarioEmbarque: string | null = null;
  if (sessao && escola) {
    const [evento] = await db.select().from(eventosTable).where(eq(eventosTable.id, sessao.eventoId));
    const [tempo] = await db.select().from(temposDeslocamentoTable)
      .where(and(
        eq(temposDeslocamentoTable.escolaId, e.escolaId),
        eq(temposDeslocamentoTable.localId, evento.localId),
      ));
    if (tempo) horarioEmbarque = subHorario(sessao.horarioInicio, tempo.minutos);
  }

  // Count alunos
  let totalAlunos = 0;
  if (escola) {
    const conditions = [eq(alunosTable.escolaId, e.escolaId)];
    if (e.periodo) conditions.push(eq(alunosTable.periodo, e.periodo));
    if (e.segmentoFiltro) conditions.push(eq(alunosTable.segmento, e.segmentoFiltro));
    if (e.turmaFiltro) conditions.push(eq(alunosTable.turma, e.turmaFiltro));
    const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(alunosTable).where(and(...conditions));
    totalAlunos = count?.count ?? 0;
  }

  return {
    id: e.id, sessao_id: e.sessaoId, escola_id: e.escolaId,
    escola_nome: escola?.nome ?? null,
    veiculo_id: e.veiculoId, veiculo_placa: veiculo?.placa ?? null,
    veiculo_modelo: veiculo?.modelo ?? null,
    motorista_id: e.motoristaId, motorista_nome: motorista?.nome ?? null,
    vagas_disponibilizadas: e.vagasDisponibilizadas ?? 0,
    horario_embarque: horarioEmbarque,
    periodo: e.periodo, segmento_filtro: e.segmentoFiltro,
    turma_filtro: e.turmaFiltro, total_alunos: totalAlunos,
  };
}

router.get("/escalas", async (req, res) => {
  try {
    const params = ListEscalasQueryParams.parse(req.query);
    const conditions = [];
    if (params.sessao_id) conditions.push(eq(escalasTable.sessaoId, params.sessao_id));
    if (params.escola_id) conditions.push(eq(escalasTable.escolaId, params.escola_id));
    if (params.evento_id) {
      const sessoes = await db.select().from(sessoesTable).where(eq(sessoesTable.eventoId, params.evento_id));
      const sessaoIds = sessoes.map(s => s.id);
      if (sessaoIds.length === 0) return res.json([]);
      conditions.push(sql`${escalasTable.sessaoId} = ANY(ARRAY[${sql.join(sessaoIds.map(id => sql`${id}`), sql`, `)}]::int[])`);
    }

    const escalas = await db.select().from(escalasTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const result = await Promise.all(escalas.map(enrichEscala));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error listing escalas");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/escalas", async (req, res) => {
  try {
    const body = CreateEscalaBody.parse(req.body);

    // Check driver double-booking
    if (body.motorista_id) {
      const [sessao] = await db.select().from(sessoesTable).where(eq(sessoesTable.id, body.sessao_id));
      if (sessao) {
        const [evento] = await db.select().from(eventosTable).where(eq(eventosTable.id, sessao.eventoId));
        if (evento) {
          const conflito = await db.select({ id: escalasTable.id })
            .from(escalasTable)
            .innerJoin(sessoesTable, eq(escalasTable.sessaoId, sessoesTable.id))
            .innerJoin(eventosTable, eq(sessoesTable.eventoId, eventosTable.id))
            .where(and(
              eq(escalasTable.motoristaId, body.motorista_id),
              eq(eventosTable.data, evento.data),
            ));
          if (conflito.length > 0) {
            return res.status(400).json({ error: "Motorista já escalado nesta data" });
          }
        }
      }
    }

    const [veiculo] = await db.select().from(veiculosTable).where(eq(veiculosTable.id, body.veiculo_id));
    const [escala] = await db.insert(escalasTable).values({
      sessaoId: body.sessao_id,
      escolaId: body.escola_id,
      veiculoId: body.veiculo_id,
      motoristaId: body.motorista_id ?? null,
      vagasDisponibilizadas: body.vagas_disponibilizadas ?? (veiculo?.lugares ?? 0),
      periodo: body.periodo ?? null,
      segmentoFiltro: body.segmento_filtro ?? null,
      turmaFiltro: body.turma_filtro ?? null,
    }).returning();

    const enriched = await enrichEscala(escala);
    res.status(201).json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error creating escala");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.get("/escalas/:id", async (req, res) => {
  try {
    const { id } = GetEscalaParams.parse({ id: Number(req.params.id) });
    const [escala] = await db.select().from(escalasTable).where(eq(escalasTable.id, id));
    if (!escala) return res.status(404).json({ error: "Not found" });
    const enriched = await enrichEscala(escala);
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error getting escala");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/escalas/:id", async (req, res) => {
  try {
    const { id } = UpdateEscalaParams.parse({ id: Number(req.params.id) });
    const body = UpdateEscalaBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.veiculo_id !== undefined) updates.veiculoId = body.veiculo_id;
    if (body.motorista_id !== undefined) updates.motoristaId = body.motorista_id;
    if (body.vagas_disponibilizadas !== undefined) updates.vagasDisponibilizadas = body.vagas_disponibilizadas;
    if (body.periodo !== undefined) updates.periodo = body.periodo;
    if (body.segmento_filtro !== undefined) updates.segmentoFiltro = body.segmento_filtro;
    if (body.turma_filtro !== undefined) updates.turmaFiltro = body.turma_filtro;
    const [escala] = await db.update(escalasTable).set(updates).where(eq(escalasTable.id, id)).returning();
    if (!escala) return res.status(404).json({ error: "Not found" });
    const enriched = await enrichEscala(escala);
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error updating escala");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.delete("/escalas/:id", async (req, res) => {
  try {
    const { id } = DeleteEscalaParams.parse({ id: Number(req.params.id) });
    await db.delete(escalasTable).where(eq(escalasTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting escala");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/escalas/:id/capacidade", async (req, res) => {
  try {
    const { id } = GetEscalaParams.parse({ id: Number(req.params.id) });
    const [escala] = await db.select().from(escalasTable).where(eq(escalasTable.id, id));
    if (!escala) return res.status(404).json({ error: "Not found" });

    const [escola] = await db.select().from(escolasTable).where(eq(escolasTable.id, escala.escolaId));
    const [sessao] = await db.select().from(sessoesTable).where(eq(sessoesTable.id, escala.sessaoId));

    const conditions = [eq(alunosTable.escolaId, escala.escolaId)];
    if (escala.periodo) conditions.push(eq(alunosTable.periodo, escala.periodo));
    if (escala.segmentoFiltro) conditions.push(eq(alunosTable.segmento, escala.segmentoFiltro));
    if (escala.turmaFiltro) conditions.push(eq(alunosTable.turma, escala.turmaFiltro));
    const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(alunosTable).where(and(...conditions));

    const totalAlunos = count?.count ?? 0;
    const totalVagas = escala.vagasDisponibilizadas ?? 0;

    let horarioEmbarque: string | null = null;
    let tempoMin: number | null = null;
    if (sessao) {
      const [evento] = await db.select().from(eventosTable).where(eq(eventosTable.id, sessao.eventoId));
      if (evento) {
        const [tempo] = await db.select().from(temposDeslocamentoTable)
          .where(and(
            eq(temposDeslocamentoTable.escolaId, escala.escolaId),
            eq(temposDeslocamentoTable.localId, evento.localId),
          ));
        if (tempo) {
          tempoMin = tempo.minutos;
          const [h, m] = sessao.horarioInicio.split(":").map(Number);
          const total = h * 60 + m - tempo.minutos;
          const finalTotal = total < 0 ? 0 : total;
          horarioEmbarque = `${String(Math.floor(finalTotal / 60)).padStart(2, "0")}:${String(finalTotal % 60).padStart(2, "0")}`;
        }
      }
    }

    res.json({
      escala_id: id,
      escola_nome: escola?.nome ?? "",
      total_alunos: totalAlunos,
      total_vagas: totalVagas,
      vagas_sobra: totalVagas - totalAlunos,
      horario_embarque: horarioEmbarque,
      tempo_deslocamento_minutos: tempoMin,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting escala capacidade");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
