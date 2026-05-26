import { Router, type IRouter } from "express";
import { db, veiculosTable, empresasTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateVeiculoBody, UpdateVeiculoParams, UpdateVeiculoBody,
  DeleteVeiculoParams, GetVeiculoParams, ImportVeiculosBody,
  ListVeiculosQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapVeiculo(v: typeof veiculosTable.$inferSelect, empresaNome: string | null) {
  return {
    id: v.id, prefixo: v.prefixo, tipo: v.tipo, marca: v.marca,
    modelo: v.modelo, placa: v.placa, cor: v.cor,
    empresa_id: v.empresaId, empresa_nome: empresaNome,
    lugares: v.lugares ?? 0, situacao: v.situacao,
    tipo_utilizacao: v.tipoUtilizacao, ano: v.ano,
    acessibilidade: v.acessibilidade ?? false,
  };
}

router.get("/veiculos", async (req, res) => {
  try {
    const params = ListVeiculosQueryParams.parse(req.query);
    const veiculos = await db.select({
      ...veiculosTable,
      empresaNome: empresasTable.nome,
    }).from(veiculosTable)
      .leftJoin(empresasTable, eq(veiculosTable.empresaId, empresasTable.id))
      .orderBy(veiculosTable.modelo);

    let result = veiculos.map(v => mapVeiculo(v, v.empresaNome ?? null));
    if (params.empresa_id) result = result.filter(v => v.empresa_id === params.empresa_id);
    if (params.situacao) result = result.filter(v => v.situacao === params.situacao);
    if (params.tipo_utilizacao) result = result.filter(v => v.tipo_utilizacao === params.tipo_utilizacao);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error listing veiculos");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/veiculos", async (req, res) => {
  try {
    const body = CreateVeiculoBody.parse(req.body);
    const [veiculo] = await db.insert(veiculosTable).values({
      prefixo: body.prefixo ?? null, tipo: body.tipo ?? null,
      marca: body.marca ?? null, modelo: body.modelo,
      placa: body.placa, cor: body.cor ?? null,
      empresaId: body.empresa_id,
      lugares: body.lugares ?? 0,
      situacao: body.situacao ?? null,
      tipoUtilizacao: body.tipo_utilizacao ?? null,
      ano: body.ano ?? null,
      acessibilidade: body.acessibilidade ?? false,
    }).returning();
    res.status(201).json(mapVeiculo(veiculo, null));
  } catch (err) {
    req.log.error({ err }, "Error creating veiculo");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.post("/veiculos/import", async (req, res) => {
  try {
    ImportVeiculosBody.parse(req.body);
    const fileBuffer = Buffer.from(req.body.fileBase64, "base64");
    const { parseXlsxBuffer } = await import("../lib/xlsx-parser.js");
    const rows = parseXlsxBuffer(fileBuffer);
    if (!rows || rows.length < 2) return res.json({ total: 0, importados: 0, ignorados: 0, erros: [] });
    const headers = rows[0] as (string | null)[];
    const idx = (name: string) => headers.findIndex(h => h?.toLowerCase().includes(name.toLowerCase()));
    const idxModelo = idx("Modelo"); const idxPlaca = idx("Placa");
    const idxLugares = idx("Lugares"); const idxEmpresa = idx("Empresa");
    const idxPrefixo = idx("Prefixo"); const idxMarca = idx("Marca");
    const idxSit = idx("Situação"); const idxTipo = idx("Espécie");
    let importados = 0; const erros: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as (string | null)[];
      const modelo = row[idxModelo] ?? "";
      const placa = row[idxPlaca] ?? "";
      if (!modelo || !placa) { erros.push(`Linha ${i + 1}: modelo/placa vazio`); continue; }
      const empresaNome = idxEmpresa >= 0 ? (row[idxEmpresa] ?? null) : null;
      let empresaId: number | null = null;
      if (empresaNome) {
        const [emp] = await db.select().from(empresasTable).where(eq(empresasTable.nome, empresaNome));
        if (emp) empresaId = emp.id;
        else {
          const [newEmp] = await db.insert(empresasTable).values({ nome: empresaNome }).returning();
          empresaId = newEmp.id;
        }
      }
      if (!empresaId) { erros.push(`Linha ${i + 1}: empresa não encontrada`); continue; }
      try {
        const existing = await db.select().from(veiculosTable).where(eq(veiculosTable.placa, placa));
        if (existing.length === 0) {
          await db.insert(veiculosTable).values({
            modelo, placa, empresaId,
            prefixo: idxPrefixo >= 0 ? (row[idxPrefixo] ?? null) : null,
            marca: idxMarca >= 0 ? (row[idxMarca] ?? null) : null,
            lugares: idxLugares >= 0 ? (parseInt(row[idxLugares] ?? "0") || 0) : 0,
            situacao: idxSit >= 0 ? (row[idxSit] ?? null) : null,
            tipo: idxTipo >= 0 ? (row[idxTipo] ?? null) : null,
          });
        }
        importados++;
      } catch (e) { erros.push(`Linha ${i + 1}: ${String(e)}`); }
    }
    res.json({ total: rows.length - 1, importados, ignorados: rows.length - 1 - importados - erros.length, erros });
  } catch (err) {
    req.log.error({ err }, "Error importing veiculos");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.get("/veiculos/:id", async (req, res) => {
  try {
    const { id } = GetVeiculoParams.parse({ id: Number(req.params.id) });
    const [v] = await db.select({ ...veiculosTable, empresaNome: empresasTable.nome })
      .from(veiculosTable).leftJoin(empresasTable, eq(veiculosTable.empresaId, empresasTable.id))
      .where(eq(veiculosTable.id, id));
    if (!v) return res.status(404).json({ error: "Not found" });
    res.json(mapVeiculo(v, v.empresaNome ?? null));
  } catch (err) {
    req.log.error({ err }, "Error getting veiculo");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/veiculos/:id", async (req, res) => {
  try {
    const { id } = UpdateVeiculoParams.parse({ id: Number(req.params.id) });
    const body = UpdateVeiculoBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.modelo !== undefined) updates.modelo = body.modelo;
    if (body.placa !== undefined) updates.placa = body.placa;
    if (body.cor !== undefined) updates.cor = body.cor;
    if (body.empresa_id !== undefined) updates.empresaId = body.empresa_id;
    if (body.lugares !== undefined) updates.lugares = body.lugares;
    if (body.situacao !== undefined) updates.situacao = body.situacao;
    if (body.tipo_utilizacao !== undefined) updates.tipoUtilizacao = body.tipo_utilizacao;
    if (body.acessibilidade !== undefined) updates.acessibilidade = body.acessibilidade;
    const [v] = await db.update(veiculosTable).set(updates).where(eq(veiculosTable.id, id)).returning();
    if (!v) return res.status(404).json({ error: "Not found" });
    res.json(mapVeiculo(v, null));
  } catch (err) {
    req.log.error({ err }, "Error updating veiculo");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.delete("/veiculos/:id", async (req, res) => {
  try {
    const { id } = DeleteVeiculoParams.parse({ id: Number(req.params.id) });
    await db.delete(veiculosTable).where(eq(veiculosTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting veiculo");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
