import { Router, type IRouter } from "express";
import { db, locaisTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateLocalBody, UpdateLocalParams, UpdateLocalBody,
  DeleteLocalParams, GetLocalParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/locais", async (req, res) => {
  try {
    const locais = await db.select().from(locaisTable).orderBy(locaisTable.nome);
    res.json(locais);
  } catch (err) {
    req.log.error({ err }, "Error listing locais");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/locais", async (req, res) => {
  try {
    const body = CreateLocalBody.parse(req.body);
    const [local] = await db.insert(locaisTable).values({
      nome: body.nome,
      endereco: body.endereco ?? null,
      cidade: body.cidade ?? null,
      observacoes: body.observacoes ?? null,
    }).returning();
    res.status(201).json(local);
  } catch (err) {
    req.log.error({ err }, "Error creating local");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.get("/locais/:id", async (req, res) => {
  try {
    const { id } = GetLocalParams.parse({ id: Number(req.params.id) });
    const [local] = await db.select().from(locaisTable).where(eq(locaisTable.id, id));
    if (!local) return res.status(404).json({ error: "Not found" });
    res.json(local);
  } catch (err) {
    req.log.error({ err }, "Error getting local");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/locais/:id", async (req, res) => {
  try {
    const { id } = UpdateLocalParams.parse({ id: Number(req.params.id) });
    const body = UpdateLocalBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.nome !== undefined) updates.nome = body.nome;
    if (body.endereco !== undefined) updates.endereco = body.endereco;
    if (body.cidade !== undefined) updates.cidade = body.cidade;
    if (body.observacoes !== undefined) updates.observacoes = body.observacoes;
    const [local] = await db.update(locaisTable).set(updates).where(eq(locaisTable.id, id)).returning();
    if (!local) return res.status(404).json({ error: "Not found" });
    res.json(local);
  } catch (err) {
    req.log.error({ err }, "Error updating local");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.delete("/locais/:id", async (req, res) => {
  try {
    const { id } = DeleteLocalParams.parse({ id: Number(req.params.id) });
    await db.delete(locaisTable).where(eq(locaisTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting local");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
