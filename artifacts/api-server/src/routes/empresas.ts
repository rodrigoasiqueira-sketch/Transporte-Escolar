import { Router, type IRouter } from "express";
import { db, empresasTable, veiculosTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateEmpresaBody,
  UpdateEmpresaParams,
  UpdateEmpresaBody,
  DeleteEmpresaParams,
  GetEmpresaParams,
  ImportEmpresasBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/empresas", async (req, res) => {
  try {
    const empresas = await db.select({
      id: empresasTable.id,
      codigo: empresasTable.codigo,
      nome: empresasTable.nome,
      cnpj: empresasTable.cnpj,
      responsavel: empresasTable.responsavel,
      telefone: empresasTable.telefone,
      email: empresasTable.email,
      modalidade: empresasTable.modalidade,
      ativo: empresasTable.ativo,
      totalVeiculos: sql<number>`(select count(*) from ${veiculosTable} where ${veiculosTable.empresaId} = ${empresasTable.id})::int`,
    }).from(empresasTable).orderBy(empresasTable.nome);
    res.json(empresas.map(e => ({ ...e, total_veiculos: e.totalVeiculos })));
  } catch (err) {
    req.log.error({ err }, "Error listing empresas");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/empresas", async (req, res) => {
  try {
    const body = CreateEmpresaBody.parse(req.body);
    const [empresa] = await db.insert(empresasTable).values({
      codigo: body.codigo ?? null,
      nome: body.nome,
      cnpj: body.cnpj ?? null,
      responsavel: body.responsavel ?? null,
      telefone: body.telefone ?? null,
      email: body.email ?? null,
      modalidade: body.modalidade ?? null,
      ativo: body.ativo ?? true,
    }).returning();
    res.status(201).json({ ...empresa, total_veiculos: 0 });
  } catch (err) {
    req.log.error({ err }, "Error creating empresa");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.post("/empresas/import", async (req, res) => {
  try {
    ImportEmpresasBody.parse(req.body);
    // Parse base64 xlsx and import
    const fileBuffer = Buffer.from(req.body.fileBase64, "base64");
    const { parseXlsxBuffer } = await import("../lib/xlsx-parser.js");
    const rows = parseXlsxBuffer(fileBuffer);
    if (!rows || rows.length < 2) return res.json({ total: 0, importados: 0, ignorados: 0, erros: [] });
    const headers = rows[0] as string[];
    const idxNome = headers.findIndex(h => h?.toLowerCase().includes("nome"));
    const idxCnpj = headers.findIndex(h => h?.toLowerCase().includes("cnpj"));
    const idxCodigo = headers.findIndex(h => h?.toLowerCase().includes("código") || h?.toLowerCase().includes("codigo"));
    const idxModal = headers.findIndex(h => h?.toLowerCase().includes("modalidade"));
    let importados = 0; const erros: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      const nome = row[idxNome] ?? "";
      if (!nome) { erros.push(`Linha ${i + 1}: nome vazio`); continue; }
      try {
        const existing = await db.select().from(empresasTable).where(eq(empresasTable.nome, nome));
        if (existing.length === 0) {
          await db.insert(empresasTable).values({
            nome,
            cnpj: idxCnpj >= 0 ? (row[idxCnpj] ?? null) : null,
            codigo: idxCodigo >= 0 ? (row[idxCodigo] ?? null) : null,
            modalidade: idxModal >= 0 ? (row[idxModal] ?? null) : null,
          });
        }
        importados++;
      } catch (e) { erros.push(`Linha ${i + 1}: ${String(e)}`); }
    }
    res.json({ total: rows.length - 1, importados, ignorados: rows.length - 1 - importados - erros.length, erros });
  } catch (err) {
    req.log.error({ err }, "Error importing empresas");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.get("/empresas/:id", async (req, res) => {
  try {
    const { id } = GetEmpresaParams.parse({ id: Number(req.params.id) });
    const [empresa] = await db.select().from(empresasTable).where(eq(empresasTable.id, id));
    if (!empresa) return res.status(404).json({ error: "Not found" });
    res.json({ ...empresa, total_veiculos: null });
  } catch (err) {
    req.log.error({ err }, "Error getting empresa");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/empresas/:id", async (req, res) => {
  try {
    const { id } = UpdateEmpresaParams.parse({ id: Number(req.params.id) });
    const body = UpdateEmpresaBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.nome !== undefined) updates.nome = body.nome;
    if (body.cnpj !== undefined) updates.cnpj = body.cnpj;
    if (body.responsavel !== undefined) updates.responsavel = body.responsavel;
    if (body.telefone !== undefined) updates.telefone = body.telefone;
    if (body.email !== undefined) updates.email = body.email;
    if (body.modalidade !== undefined) updates.modalidade = body.modalidade;
    if (body.ativo !== undefined) updates.ativo = body.ativo;
    const [empresa] = await db.update(empresasTable).set(updates).where(eq(empresasTable.id, id)).returning();
    if (!empresa) return res.status(404).json({ error: "Not found" });
    res.json({ ...empresa, total_veiculos: null });
  } catch (err) {
    req.log.error({ err }, "Error updating empresa");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.delete("/empresas/:id", async (req, res) => {
  try {
    const { id } = DeleteEmpresaParams.parse({ id: Number(req.params.id) });
    await db.delete(empresasTable).where(eq(empresasTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting empresa");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
