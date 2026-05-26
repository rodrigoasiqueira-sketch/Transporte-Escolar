import { Router, type IRouter } from "express";
import { db, temposDeslocamentoTable, escolasTable, locaisTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  UpsertTempoDeslocamentoBody,
  UpdateTempoDeslocamentoParams, UpdateTempoDeslocamentoBody,
  DeleteTempoDeslocamentoParams,
  ListTemposDeslocamentoQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tempos-deslocamento", async (req, res) => {
  try {
    const params = ListTemposDeslocamentoQueryParams.parse(req.query);
    const tempos = await db.select({
      id: temposDeslocamentoTable.id,
      escolaId: temposDeslocamentoTable.escolaId,
      localId: temposDeslocamentoTable.localId,
      minutos: temposDeslocamentoTable.minutos,
      escolaNome: escolasTable.nome,
      localNome: locaisTable.nome,
    }).from(temposDeslocamentoTable)
      .leftJoin(escolasTable, eq(temposDeslocamentoTable.escolaId, escolasTable.id))
      .leftJoin(locaisTable, eq(temposDeslocamentoTable.localId, locaisTable.id));

    let result = tempos.map(t => ({
      id: t.id, escola_id: t.escolaId, local_id: t.localId,
      minutos: t.minutos, escola_nome: t.escolaNome, local_nome: t.localNome,
    }));

    if (params.escola_id) result = result.filter(t => t.escola_id === params.escola_id);
    if (params.local_id) result = result.filter(t => t.local_id === params.local_id);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error listing tempos");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tempos-deslocamento", async (req, res) => {
  try {
    const body = UpsertTempoDeslocamentoBody.parse(req.body);
    // Upsert: if already exists, update; else insert
    const [existing] = await db.select()
      .from(temposDeslocamentoTable)
      .where(and(
        eq(temposDeslocamentoTable.escolaId, body.escola_id),
        eq(temposDeslocamentoTable.localId, body.local_id),
      ));

    let tempo;
    if (existing) {
      [tempo] = await db.update(temposDeslocamentoTable)
        .set({ minutos: body.minutos })
        .where(eq(temposDeslocamentoTable.id, existing.id))
        .returning();
    } else {
      [tempo] = await db.insert(temposDeslocamentoTable).values({
        escolaId: body.escola_id,
        localId: body.local_id,
        minutos: body.minutos,
      }).returning();
    }

    const [escola] = await db.select().from(escolasTable).where(eq(escolasTable.id, tempo.escolaId));
    const [local] = await db.select().from(locaisTable).where(eq(locaisTable.id, tempo.localId));
    res.json({
      id: tempo.id, escola_id: tempo.escolaId, local_id: tempo.localId,
      minutos: tempo.minutos, escola_nome: escola?.nome ?? null, local_nome: local?.nome ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Error upserting tempo");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.patch("/tempos-deslocamento/:id", async (req, res) => {
  try {
    const { id } = UpdateTempoDeslocamentoParams.parse({ id: Number(req.params.id) });
    const body = UpdateTempoDeslocamentoBody.parse(req.body);
    const [tempo] = await db.update(temposDeslocamentoTable)
      .set({ minutos: body.minutos })
      .where(eq(temposDeslocamentoTable.id, id))
      .returning();
    if (!tempo) return res.status(404).json({ error: "Not found" });
    res.json({ id: tempo.id, escola_id: tempo.escolaId, local_id: tempo.localId, minutos: tempo.minutos, escola_nome: null, local_nome: null });
  } catch (err) {
    req.log.error({ err }, "Error updating tempo");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.delete("/tempos-deslocamento/:id", async (req, res) => {
  try {
    const { id } = DeleteTempoDeslocamentoParams.parse({ id: Number(req.params.id) });
    await db.delete(temposDeslocamentoTable).where(eq(temposDeslocamentoTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting tempo");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
