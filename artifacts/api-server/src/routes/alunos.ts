import { Router, type IRouter } from "express";
import { db, alunosTable, escolasTable } from "@workspace/db";
import { eq, sql, ilike, and, inArray } from "drizzle-orm";
import {
  CreateAlunoBody, UpdateAlunoParams, UpdateAlunoBody,
  DeleteAlunoParams, GetAlunoParams, ImportAlunosBody,
  ListAlunosQueryParams, ContagemAlunosQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Helper to classify segmento from turma
function inferSegmento(turma: string): string {
  const t = turma.toUpperCase();
  if (t.includes("INF") || t.includes("INFANT")) return "INFANTIL";
  if (t.includes("MU") || t.includes("MULTIS")) return "MULTISSERIADA";
  if (t.includes("1") || t.includes("2") || t.includes("3") || t.includes("4") || t.includes("5")) return "FUNDAMENTAL";
  if (t.includes("FUND") || t.includes("EF")) return "FUNDAMENTAL";
  return "OUTRO";
}

function isValidSegmento(turma: string): boolean {
  const t = turma.toUpperCase();
  if (t.includes("INF") || t.includes("INFANT")) return true;
  if (t.includes("MU INF") || t.includes("MULTIS")) return true;
  // Fundamental up to 5th year
  const match = t.match(/(\d+)[°ºo]?\s*(ANO|A)/);
  if (match) {
    const year = parseInt(match[1]);
    return year >= 1 && year <= 5;
  }
  if (t.includes("MU")) return true; // multisseriada
  return false;
}

function mapAluno(a: typeof alunosTable.$inferSelect, escolaNome: string | null) {
  return {
    id: a.id, ra: a.ra, nome: a.nome,
    escola_id: a.escolaId, escola_nome: escolaNome,
    turma: a.turma ?? "", classe: a.classe,
    periodo: a.periodo ?? "", segmento: a.segmento ?? "",
    sexo: a.sexo, nascimento: a.nascimento,
    situacao_matricula: a.situacaoMatricula,
    zona: a.zona, frota: a.frota,
  };
}

router.get("/alunos", async (req, res) => {
  try {
    const params = ListAlunosQueryParams.parse(req.query);
    const conditions = [];
    if (params.escola_id) conditions.push(eq(alunosTable.escolaId, params.escola_id));
    if (params.periodo) conditions.push(eq(alunosTable.periodo, params.periodo));
    if (params.segmento) conditions.push(eq(alunosTable.segmento, params.segmento));
    if (params.turma) conditions.push(eq(alunosTable.turma, params.turma));
    if (params.search) conditions.push(ilike(alunosTable.nome, `%${params.search}%`));

    const alunos = await db.select({
      ...alunosTable,
      escolaNome: escolasTable.nome,
    }).from(alunosTable)
      .leftJoin(escolasTable, eq(alunosTable.escolaId, escolasTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(alunosTable.nome)
      .limit(500);

    res.json(alunos.map(a => mapAluno(a, a.escolaNome ?? null)));
  } catch (err) {
    req.log.error({ err }, "Error listing alunos");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/alunos", async (req, res) => {
  try {
    const body = CreateAlunoBody.parse(req.body);
    const [aluno] = await db.insert(alunosTable).values({
      ra: body.ra, nome: body.nome,
      escolaId: body.escola_id,
      turma: body.turma ?? null, classe: body.classe ?? null,
      periodo: body.periodo ?? null, segmento: body.segmento ?? null,
      sexo: body.sexo ?? null, nascimento: body.nascimento ?? null,
      situacaoMatricula: body.situacao_matricula ?? null,
      zona: body.zona ?? null, frota: body.frota ?? null,
    }).returning();
    res.status(201).json(mapAluno(aluno, null));
  } catch (err) {
    req.log.error({ err }, "Error creating aluno");
    res.status(400).json({ error: "Invalid data or duplicate RA" });
  }
});

router.post("/alunos/import", async (req, res) => {
  try {
    ImportAlunosBody.parse(req.body);
    const fileBuffer = Buffer.from(req.body.fileBase64, "base64");
    const { parseXlsxBuffer } = await import("../lib/xlsx-parser.js");
    const rows = parseXlsxBuffer(fileBuffer);
    if (!rows || rows.length < 2) return res.json({ total: 0, importados: 0, ignorados: 0, erros: [] });

    const headers = rows[0] as (string | null)[];
    const idx = (name: string) => headers.findIndex(h => h?.toLowerCase().includes(name.toLowerCase()));
    const idxEscola = idx("Escola"); const idxNome = idx("Nome Aluno");
    const idxRa = idx("RA"); const idxTurma = idx("Turma");
    const idxClasse = idx("Classe"); const idxPeriodo = idx("Periodo");
    const idxSexo = idx("SEXO"); const idxNasc = idx("Nascimento");
    const idxSit = idx("Situação"); const idxZona = idx("Zona");
    const idxFrota = idx("Tipo");

    // Pre-load all schools for fast lookup
    const todasEscolas = await db.select().from(escolasTable);
    const escolaMap = new Map(todasEscolas.map(e => [e.nome.toUpperCase().trim(), e.id]));

    let importados = 0; let ignorados = 0; const erros: string[] = [];
    // Deduplicate RAs in the file itself (only keep first occurrence)
    const seenRas = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as (string | null)[];
      const ra = idxRa >= 0 ? (row[idxRa] ?? "") : "";
      const nome = idxNome >= 0 ? (row[idxNome] ?? "") : "";
      const turma = idxTurma >= 0 ? (row[idxTurma] ?? "") : "";

      if (!ra || !nome) { erros.push(`Linha ${i + 1}: RA ou nome vazio`); continue; }

      // Skip duplicate RAs (contra-turno)
      if (seenRas.has(ra)) { ignorados++; continue; }
      seenRas.add(ra);

      // Validate segmento (only Infantil, Fundamental up to 5th year, Multisseriada)
      const segmento = inferSegmento(turma);
      if (segmento === "OUTRO") { ignorados++; continue; }

      const periodo = idxPeriodo >= 0 ? (row[idxPeriodo] ?? null) : null;
      const escolaNome = idxEscola >= 0 ? ((row[idxEscola] ?? "").toUpperCase().trim()) : "";
      let escolaId: number | null = escolaMap.get(escolaNome) ?? null;

      if (!escolaId && escolaNome) {
        try {
          const [newEscola] = await db.insert(escolasTable).values({ nome: row[idxEscola]! }).returning();
          escolaId = newEscola.id;
          escolaMap.set(escolaNome, escolaId);
        } catch { /* may already exist */ }
      }

      try {
        await db.insert(alunosTable).values({
          ra, nome: row[idxNome]!,
          escolaId,
          turma: turma || null,
          classe: idxClasse >= 0 ? (row[idxClasse] ?? null) : null,
          periodo,
          segmento,
          sexo: idxSexo >= 0 ? (row[idxSexo] ?? null) : null,
          nascimento: idxNasc >= 0 ? (row[idxNasc] ?? null) : null,
          situacaoMatricula: idxSit >= 0 ? (row[idxSit] ?? null) : null,
          zona: idxZona >= 0 ? (row[idxZona] ?? null) : null,
          frota: idxFrota >= 0 ? (row[idxFrota] ?? null) : null,
        }).onConflictDoNothing();
        importados++;
      } catch (e) {
        erros.push(`Linha ${i + 1}: ${String(e)}`);
      }
    }

    res.json({ total: rows.length - 1, importados, ignorados, erros });
  } catch (err) {
    req.log.error({ err }, "Error importing alunos");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.get("/alunos/contagem", async (req, res) => {
  try {
    const params = ContagemAlunosQueryParams.parse(req.query);
    const conditions = [];
    if (params.escola_id) conditions.push(eq(alunosTable.escolaId, params.escola_id));
    if (params.periodo) conditions.push(eq(alunosTable.periodo, params.periodo));
    if (params.segmento) conditions.push(eq(alunosTable.segmento, params.segmento));

    const contagem = await db.select({
      escolaId: alunosTable.escolaId,
      escolaNome: escolasTable.nome,
      periodo: alunosTable.periodo,
      segmento: alunosTable.segmento,
      turma: alunosTable.turma,
      quantidade: sql<number>`count(*)::int`,
    }).from(alunosTable)
      .leftJoin(escolasTable, eq(alunosTable.escolaId, escolasTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(alunosTable.escolaId, escolasTable.nome, alunosTable.periodo, alunosTable.segmento, alunosTable.turma)
      .orderBy(escolasTable.nome, alunosTable.periodo, alunosTable.turma);

    res.json(contagem.map(c => ({
      escola_id: c.escolaId!, escola_nome: c.escolaNome ?? "",
      periodo: c.periodo ?? "", segmento: c.segmento ?? "",
      turma: c.turma ?? "", quantidade: c.quantidade,
    })));
  } catch (err) {
    req.log.error({ err }, "Error getting contagem");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/alunos/:id", async (req, res) => {
  try {
    const { id } = GetAlunoParams.parse({ id: Number(req.params.id) });
    const [a] = await db.select({ ...alunosTable, escolaNome: escolasTable.nome })
      .from(alunosTable).leftJoin(escolasTable, eq(alunosTable.escolaId, escolasTable.id))
      .where(eq(alunosTable.id, id));
    if (!a) return res.status(404).json({ error: "Not found" });
    res.json(mapAluno(a, a.escolaNome ?? null));
  } catch (err) {
    req.log.error({ err }, "Error getting aluno");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/alunos/:id", async (req, res) => {
  try {
    const { id } = UpdateAlunoParams.parse({ id: Number(req.params.id) });
    const body = UpdateAlunoBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.nome !== undefined) updates.nome = body.nome;
    if (body.turma !== undefined) updates.turma = body.turma;
    if (body.classe !== undefined) updates.classe = body.classe;
    if (body.periodo !== undefined) updates.periodo = body.periodo;
    if (body.segmento !== undefined) updates.segmento = body.segmento;
    if (body.situacao_matricula !== undefined) updates.situacaoMatricula = body.situacao_matricula;
    if (body.escola_id !== undefined) updates.escolaId = body.escola_id;
    const [aluno] = await db.update(alunosTable).set(updates).where(eq(alunosTable.id, id)).returning();
    if (!aluno) return res.status(404).json({ error: "Not found" });
    res.json(mapAluno(aluno, null));
  } catch (err) {
    req.log.error({ err }, "Error updating aluno");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.delete("/alunos/:id", async (req, res) => {
  try {
    const { id } = DeleteAlunoParams.parse({ id: Number(req.params.id) });
    await db.delete(alunosTable).where(eq(alunosTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting aluno");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
