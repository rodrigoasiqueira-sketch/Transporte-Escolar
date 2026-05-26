import { Router, type IRouter } from "express";
import { db, motoristasTable, empresasTable, escalasTable, sessoesTable, eventosTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateMotoristaBody,
  UpdateMotoristaParams,
  UpdateMotoristaBody,
  DeleteMotoristaParams,
  GetMotoristaParams,
  ImportMotoristasBody,
  DisponibilidadeMotoristasQueryParams,
  ListMotoristasQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/motoristas", async (req, res) => {
  try {
    const params = ListMotoristasQueryParams.parse(req.query);
    const motoristas = await db.select({
      id: motoristasTable.id,
      codigo: motoristasTable.codigo,
      nome: motoristasTable.nome,
      funcao: motoristasTable.funcao,
      telefone: motoristasTable.telefone,
      situacao: motoristasTable.situacao,
      cnhCategoria: motoristasTable.cnhCategoria,
      cnhVencimento: motoristasTable.cnhVencimento,
      empresaId: motoristasTable.empresaId,
      ehProprio: motoristasTable.ehProprio,
      empresaNome: empresasTable.nome,
    }).from(motoristasTable)
      .leftJoin(empresasTable, eq(motoristasTable.empresaId, empresasTable.id))
      .orderBy(motoristasTable.nome);

    let result = motoristas.map(m => ({
      id: m.id, codigo: m.codigo, nome: m.nome, funcao: m.funcao,
      telefone: m.telefone, situacao: m.situacao ?? "Ativo",
      cnh_categoria: m.cnhCategoria, cnh_vencimento: m.cnhVencimento,
      empresa_id: m.empresaId, empresa_nome: m.empresaNome,
      eh_proprio: m.ehProprio ?? true,
    }));

    if (params.situacao) result = result.filter(m => m.situacao === params.situacao);
    if (params.empresa_id) result = result.filter(m => m.empresa_id === params.empresa_id);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error listing motoristas");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/motoristas", async (req, res) => {
  try {
    const body = CreateMotoristaBody.parse(req.body);
    const [motorista] = await db.insert(motoristasTable).values({
      codigo: body.codigo ?? null,
      nome: body.nome,
      funcao: body.funcao ?? null,
      telefone: body.telefone ?? null,
      situacao: body.situacao ?? "Ativo",
      cnhCategoria: body.cnh_categoria ?? null,
      cnhVencimento: body.cnh_vencimento ?? null,
      empresaId: body.empresa_id ?? null,
      ehProprio: body.eh_proprio ?? true,
    }).returning();
    res.status(201).json({
      id: motorista.id, codigo: motorista.codigo, nome: motorista.nome,
      funcao: motorista.funcao, telefone: motorista.telefone,
      situacao: motorista.situacao ?? "Ativo",
      cnh_categoria: motorista.cnhCategoria, cnh_vencimento: motorista.cnhVencimento,
      empresa_id: motorista.empresaId, empresa_nome: null,
      eh_proprio: motorista.ehProprio ?? true,
    });
  } catch (err) {
    req.log.error({ err }, "Error creating motorista");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.post("/motoristas/import", async (req, res) => {
  try {
    ImportMotoristasBody.parse(req.body);
    const fileBuffer = Buffer.from(req.body.fileBase64, "base64");
    const { parseXlsxBuffer } = await import("../lib/xlsx-parser.js");
    const rows = parseXlsxBuffer(fileBuffer);
    if (!rows || rows.length < 2) return res.json({ total: 0, importados: 0, ignorados: 0, erros: [] });
    const headers = rows[0] as string[];
    const idx = (name: string) => headers.findIndex(h => h?.toLowerCase().includes(name.toLowerCase()));
    const idxNome = idx("Nome"); const idxCodigo = idx("Código"); const idxFuncao = idx("Função");
    const idxTel = idx("Telefone"); const idxSit = idx("Situação"); const idxCnh = idx("CNH Categoria");
    let importados = 0; const erros: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as (string | null)[];
      const nome = row[idxNome] ?? "";
      if (!nome) { erros.push(`Linha ${i + 1}: nome vazio`); continue; }
      try {
        const existing = await db.select().from(motoristasTable).where(eq(motoristasTable.nome, nome));
        if (existing.length === 0) {
          await db.insert(motoristasTable).values({
            nome, codigo: idxCodigo >= 0 ? (row[idxCodigo] ?? null) : null,
            funcao: idxFuncao >= 0 ? (row[idxFuncao] ?? null) : null,
            telefone: idxTel >= 0 ? (row[idxTel] ?? null) : null,
            situacao: idxSit >= 0 ? (row[idxSit] ?? "Ativo") : "Ativo",
            cnhCategoria: idxCnh >= 0 ? (row[idxCnh] ?? null) : null,
            ehProprio: true,
          });
        }
        importados++;
      } catch (e) { erros.push(`Linha ${i + 1}: ${String(e)}`); }
    }
    res.json({ total: rows.length - 1, importados, ignorados: rows.length - 1 - importados - erros.length, erros });
  } catch (err) {
    req.log.error({ err }, "Error importing motoristas");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.get("/motoristas/disponibilidade", async (req, res) => {
  try {
    const params = DisponibilidadeMotoristasQueryParams.parse(req.query);
    const { data, sessao_id } = params;
    // Get all active drivers that are "próprios"
    const motoristas = await db.select({
      id: motoristasTable.id,
      nome: motoristasTable.nome,
      situacao: motoristasTable.situacao,
      ehProprio: motoristasTable.ehProprio,
    }).from(motoristasTable).where(eq(motoristasTable.situacao, "Ativo"));

    // Find which drivers are already scaled for this date
    const conflitos = await db.select({
      motoristaId: escalasTable.motoristaId,
      sessaoId: escalasTable.sessaoId,
    }).from(escalasTable)
      .innerJoin(sessoesTable, eq(escalasTable.sessaoId, sessoesTable.id))
      .innerJoin(eventosTable, eq(sessoesTable.eventoId, eventosTable.id))
      .where(eq(eventosTable.data, data));

    const conflitadosIds = new Set(conflitos.map(c => c.motoristaId));

    res.json(motoristas.map(m => ({
      id: m.id, nome: m.nome,
      disponivel: !conflitadosIds.has(m.id),
      conflito: conflitadosIds.has(m.id) ? "Já escalado nesta data" : null,
    })));
  } catch (err) {
    req.log.error({ err }, "Error checking disponibilidade");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/motoristas/:id", async (req, res) => {
  try {
    const { id } = GetMotoristaParams.parse({ id: Number(req.params.id) });
    const [motorista] = await db.select().from(motoristasTable).where(eq(motoristasTable.id, id));
    if (!motorista) return res.status(404).json({ error: "Not found" });
    res.json({
      id: motorista.id, codigo: motorista.codigo, nome: motorista.nome,
      funcao: motorista.funcao, telefone: motorista.telefone,
      situacao: motorista.situacao ?? "Ativo",
      cnh_categoria: motorista.cnhCategoria, cnh_vencimento: motorista.cnhVencimento,
      empresa_id: motorista.empresaId, empresa_nome: null,
      eh_proprio: motorista.ehProprio ?? true,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting motorista");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/motoristas/:id", async (req, res) => {
  try {
    const { id } = UpdateMotoristaParams.parse({ id: Number(req.params.id) });
    const body = UpdateMotoristaBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.nome !== undefined) updates.nome = body.nome;
    if (body.funcao !== undefined) updates.funcao = body.funcao;
    if (body.telefone !== undefined) updates.telefone = body.telefone;
    if (body.situacao !== undefined) updates.situacao = body.situacao;
    if (body.cnh_categoria !== undefined) updates.cnhCategoria = body.cnh_categoria;
    if (body.cnh_vencimento !== undefined) updates.cnhVencimento = body.cnh_vencimento;
    if (body.empresa_id !== undefined) updates.empresaId = body.empresa_id;
    if (body.eh_proprio !== undefined) updates.ehProprio = body.eh_proprio;
    const [motorista] = await db.update(motoristasTable).set(updates).where(eq(motoristasTable.id, id)).returning();
    if (!motorista) return res.status(404).json({ error: "Not found" });
    res.json({
      id: motorista.id, codigo: motorista.codigo, nome: motorista.nome,
      funcao: motorista.funcao, telefone: motorista.telefone,
      situacao: motorista.situacao ?? "Ativo",
      cnh_categoria: motorista.cnhCategoria, cnh_vencimento: motorista.cnhVencimento,
      empresa_id: motorista.empresaId, empresa_nome: null,
      eh_proprio: motorista.ehProprio ?? true,
    });
  } catch (err) {
    req.log.error({ err }, "Error updating motorista");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.delete("/motoristas/:id", async (req, res) => {
  try {
    const { id } = DeleteMotoristaParams.parse({ id: Number(req.params.id) });
    await db.delete(motoristasTable).where(eq(motoristasTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting motorista");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
