import { Router, type IRouter } from "express";
import { db, alunosTable, escolasTable } from "@workspace/db";
import { eq, sql, ilike, and } from "drizzle-orm";
import {
  CreateAlunoBody, UpdateAlunoParams, UpdateAlunoBody,
  DeleteAlunoParams, GetAlunoParams, ImportAlunosBody,
  ListAlunosQueryParams, ContagemAlunosQueryParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Find first column index whose header matches any fragment.
// Exact match (case-insensitive) is tried first across all headers;
// only if no exact match is found falls back to substring search.
function findCol(headers: (string | null)[], ...fragments: string[]): number {
  // 1) Exact match pass
  for (const fragment of fragments) {
    const idx = headers.findIndex(
      h => h != null && h.toLowerCase().trim() === fragment.toLowerCase().trim()
    );
    if (idx >= 0) return idx;
  }
  // 2) Substring fallback
  return headers.findIndex(h => {
    if (!h) return false;
    const low = h.toLowerCase().trim();
    return fragments.some(f => low.includes(f.toLowerCase()));
  });
}

function inferSegmento(turma: string | null, segmentoCol: string | null): string {
  // If a segmento column exists, use it directly
  if (segmentoCol) {
    const s = segmentoCol.toUpperCase().trim();
    if (s.includes("INFANT")) return "INFANTIL";
    if (s.includes("MULTI") || s.includes("MULT") || s.includes("SERIADA")) return "MULTISSERIADA";
    if (s.includes("FUND") || s.includes("EF") || s.includes("ANOS")) return "FUNDAMENTAL";
  }

  if (!turma) return "OUTRO";
  const t = turma.toUpperCase().trim();

  // ── Multisseriada (check before Infantil to catch "MU INF") ──────────────
  // Patterns: "MU INF (...)", "FUND - MULT (...)", "S1 - MULT (...)"
  if (t.match(/^MU\s+INF/)) return "MULTISSERIADA";
  if (t.includes("MULT")) return "MULTISSERIADA";     // FUND - MULT, S1 - MULT
  if (t.includes("MULTI")) return "MULTISSERIADA";
  if (t.includes("SERIADA")) return "MULTISSERIADA";

  // ── Infantil ──────────────────────────────────────────────────────────────
  // Patterns: "INF I", "INF II", "INF V", "INFANTIL", "BERÇÁRIO 1", "EI"
  if (t.match(/^INF\s*(I{1,3}|IV|V|VI)?($|\s|\()/)) return "INFANTIL";
  if (t.match(/^INFANTIL/)) return "INFANTIL";
  if (t.match(/^BERÇ/)) return "INFANTIL";
  if (t.match(/^EI\s/)) return "INFANTIL";
  if (t.match(/^PRÉ\s|^PRE\s|^PRE-/)) return "INFANTIL";
  if (t.match(/^CRECHE/)) return "INFANTIL";
  if (t.includes("INFANT")) return "INFANTIL";

  // ── Fundamental 1º–5º ─────────────────────────────────────────────────────
  // Patterns: "1º", "2º", "3º", "4º", "5º", "1° ANO", "2 ANO", "1A", "2B", "01A"
  // Just the ordinal number like "5º"
  const matchOrdinal = t.match(/^0?([1-9])\s*[°ºo]/);
  if (matchOrdinal) {
    const year = parseInt(matchOrdinal[1]);
    if (year >= 1 && year <= 5) return "FUNDAMENTAL";
    return "OUTRO";
  }

  // Class code: "1A", "2B", "3C" etc.
  const matchCode = t.match(/^0?([1-9])[A-Z\s]/);
  if (matchCode) {
    const year = parseInt(matchCode[1]);
    if (year >= 1 && year <= 5) return "FUNDAMENTAL";
    return "OUTRO";
  }

  // AEE with grade info like "AEE (1º)", "AEE (INF IV)"
  const matchAee = t.match(/^AEE\s*\(([^)]+)\)/);
  if (matchAee) {
    const inner = matchAee[1].trim();
    const sub = inferSegmento(inner, null);
    return sub !== "OUTRO" ? sub : "OUTRO";
  }

  return "OUTRO";
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

    logger.info({ totalRows: rows.length }, "XLSX parsed");

    if (!rows || rows.length < 2) {
      return res.json({ total: 0, importados: 0, ignorados: 0, erros: ["Arquivo vazio ou sem linhas de dados"] });
    }

    const headers = rows[0] as (string | null)[];
    logger.info({ headers }, "XLSX headers found");

    // Flexible column detection
    const idxEscola   = findCol(headers, "escola");
    const idxNome     = findCol(headers, "nome aluno", "nome do aluno", "aluno", "nome");
    const idxRa       = findCol(headers, "ra", "r.a", "r. a", "registro");
    const idxTurma    = findCol(headers, "turma");
    const idxClasse   = findCol(headers, "classe");
    const idxPeriodo  = findCol(headers, "periodo", "período", "turno");
    const idxSegmento = findCol(headers, "segmento", "modalidade");
    const idxSexo     = findCol(headers, "sexo", "gênero", "genero");
    const idxNasc     = findCol(headers, "nascimento", "data nasc", "dt nasc");
    const idxSit      = findCol(headers, "situação", "situacao", "status", "matrícula");
    const idxZona     = findCol(headers, "zona");
    const idxFrota    = findCol(headers, "frota", "tipo", "modalidade");

    logger.info({
      idxRa, idxNome, idxTurma, idxEscola, idxPeriodo, idxSegmento
    }, "Column indices resolved");

    if (idxRa < 0 || idxNome < 0) {
      return res.json({
        total: 0, importados: 0, ignorados: 0,
        erros: [`Colunas obrigatórias não encontradas. Cabeçalhos detectados: ${headers.filter(Boolean).join(", ")}`],
      });
    }

    // Pre-load all schools for fast lookup
    const todasEscolas = await db.select().from(escolasTable);
    const escolaMap = new Map(todasEscolas.map(e => [e.nome.toUpperCase().trim(), e.id]));

    let importados = 0;
    let ignorados = 0;
    const erros: string[] = [];
    const seenRas = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as (string | null)[];

      // Skip completely empty rows
      if (row.every(cell => !cell)) continue;

      const ra = String(row[idxRa] ?? "").trim();
      const nome = String(row[idxNome] ?? "").trim();
      const turma = idxTurma >= 0 ? String(row[idxTurma] ?? "").trim() : "";
      const segmentoRaw = idxSegmento >= 0 ? String(row[idxSegmento] ?? "").trim() : null;

      if (!ra || !nome) {
        erros.push(`Linha ${i + 1}: RA ou nome vazio`);
        continue;
      }

      // Skip duplicate RAs (contra-turno)
      if (seenRas.has(ra)) {
        ignorados++;
        continue;
      }
      seenRas.add(ra);

      // Determine segmento
      const segmento = inferSegmento(turma, segmentoRaw);
      if (segmento === "OUTRO") {
        ignorados++;
        continue;
      }

      const periodo = idxPeriodo >= 0 ? String(row[idxPeriodo] ?? "").trim() || null : null;
      const escolaNomeRaw = idxEscola >= 0 ? String(row[idxEscola] ?? "").trim() : "";
      const escolaNomeKey = escolaNomeRaw.toUpperCase();
      let escolaId: number | null = escolaMap.get(escolaNomeKey) ?? null;

      if (!escolaId && escolaNomeRaw) {
        try {
          const [newEscola] = await db.insert(escolasTable)
            .values({ nome: escolaNomeRaw })
            .onConflictDoNothing()
            .returning();
          if (newEscola) {
            escolaId = newEscola.id;
            escolaMap.set(escolaNomeKey, escolaId);
          }
        } catch {
          const [existing] = await db.select().from(escolasTable)
            .where(eq(sql`upper(trim(${escolasTable.nome}))`, escolaNomeKey));
          if (existing) escolaId = existing.id;
        }
      }

      try {
        await db.insert(alunosTable).values({
          ra,
          nome,
          escolaId,
          turma: turma || null,
          classe: idxClasse >= 0 ? (String(row[idxClasse] ?? "").trim() || null) : null,
          periodo,
          segmento,
          sexo: idxSexo >= 0 ? (String(row[idxSexo] ?? "").trim() || null) : null,
          nascimento: idxNasc >= 0 ? (String(row[idxNasc] ?? "").trim() || null) : null,
          situacaoMatricula: idxSit >= 0 ? (String(row[idxSit] ?? "").trim() || null) : null,
          zona: idxZona >= 0 ? (String(row[idxZona] ?? "").trim() || null) : null,
          frota: idxFrota >= 0 ? (String(row[idxFrota] ?? "").trim() || null) : null,
        }).onConflictDoNothing();
        importados++;
      } catch (e) {
        erros.push(`Linha ${i + 1}: ${String(e)}`);
      }
    }

    logger.info({ importados, ignorados, erros: erros.length }, "Import complete");
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
