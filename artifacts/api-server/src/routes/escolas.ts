import { Router, type IRouter } from "express";
import { db, escolasTable, alunosTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateEscolaBody,
  UpdateEscolaParams,
  UpdateEscolaBody,
  DeleteEscolaParams,
  GetEscolaParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/escolas", async (req, res) => {
  try {
    const escolas = await db.select({
      id: escolasTable.id,
      nome: escolasTable.nome,
      numProdesp: escolasTable.numProdesp,
      endereco: escolasTable.endereco,
      cidade: escolasTable.cidade,
      totalAlunos: sql<number>`(select count(*) from ${alunosTable} where ${alunosTable.escolaId} = ${escolasTable.id})::int`,
    }).from(escolasTable).orderBy(escolasTable.nome);

    res.json(escolas.map(e => ({
      id: e.id,
      nome: e.nome,
      num_prodesp: e.numProdesp,
      endereco: e.endereco,
      cidade: e.cidade,
      total_alunos: e.totalAlunos,
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing escolas");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/escolas", async (req, res) => {
  try {
    const body = CreateEscolaBody.parse(req.body);
    const [escola] = await db.insert(escolasTable).values({
      nome: body.nome,
      numProdesp: body.num_prodesp ?? null,
      endereco: body.endereco ?? null,
      cidade: body.cidade ?? null,
    }).returning();
    res.status(201).json({ id: escola.id, nome: escola.nome, num_prodesp: escola.numProdesp, endereco: escola.endereco, cidade: escola.cidade, total_alunos: 0 });
  } catch (err) {
    req.log.error({ err }, "Error creating escola");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.get("/escolas/:id", async (req, res) => {
  try {
    const { id } = GetEscolaParams.parse({ id: Number(req.params.id) });
    const [escola] = await db.select().from(escolasTable).where(eq(escolasTable.id, id));
    if (!escola) return res.status(404).json({ error: "Not found" });
    res.json({ id: escola.id, nome: escola.nome, num_prodesp: escola.numProdesp, endereco: escola.endereco, cidade: escola.cidade, total_alunos: null });
  } catch (err) {
    req.log.error({ err }, "Error getting escola");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/escolas/:id", async (req, res) => {
  try {
    const { id } = UpdateEscolaParams.parse({ id: Number(req.params.id) });
    const body = UpdateEscolaBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.nome !== undefined) updates.nome = body.nome;
    if (body.num_prodesp !== undefined) updates.numProdesp = body.num_prodesp;
    if (body.endereco !== undefined) updates.endereco = body.endereco;
    if (body.cidade !== undefined) updates.cidade = body.cidade;
    const [escola] = await db.update(escolasTable).set(updates).where(eq(escolasTable.id, id)).returning();
    if (!escola) return res.status(404).json({ error: "Not found" });
    res.json({ id: escola.id, nome: escola.nome, num_prodesp: escola.numProdesp, endereco: escola.endereco, cidade: escola.cidade, total_alunos: null });
  } catch (err) {
    req.log.error({ err }, "Error updating escola");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.delete("/escolas/:id", async (req, res) => {
  try {
    const { id } = DeleteEscolaParams.parse({ id: Number(req.params.id) });
    await db.delete(escolasTable).where(eq(escolasTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting escola");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
