import { Router, type IRouter, type Request, type Response } from "express";
import { db, calendarioOperacionalTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import * as XLSX from "xlsx";
import { logger } from "../lib/logger";

const router: IRouter = Router();

interface ExcelRow {
  data?: string;
  tipo?: string;
  observacao?: string;
  rede?: string;
  conta_transporte?: string | number;
  conta_km?: string | number;
  ano_letivo?: string | number;
  trimestre?: string | number;
}

/**
 * POST /calendario-operacional/importar/excel
 * Importa registros a partir de um arquivo Excel
 */
router.post(
  "/calendario-operacional/importar/excel",
  async (req: Request, res: Response) => {
    try {
      if (!req.body.file) {
        return res.status(400).json({ error: "Arquivo não fornecido" });
      }

      // Decodificar base64
      const buffer = Buffer.from(req.body.file, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

      if (data.length === 0) {
        return res.status(400).json({ error: "Arquivo vazio" });
      }

      const agora = new Date().toISOString();
      const registrosProcessados = [];
      const erros = [];

      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];

          // Validar campos obrigatórios
          if (!row.data || !row.tipo || !row.ano_letivo) {
            erros.push({
              linha: i + 2, // +2 porque excel começa em 1 e há header
              erro: "Data, Tipo e Ano Letivo são obrigatórios",
            });
            continue;
          }

          // Verificar se data já existe
          const [existing] = await db
            .select()
            .from(calendarioOperacionalTable)
            .where(eq(calendarioOperacionalTable.data, String(row.data)));

          if (existing) {
            erros.push({
              linha: i + 2,
              erro: `Data ${row.data} já existe na base de dados`,
            });
            continue;
          }

          // Inserir registro
          const [registro] = await db
            .insert(calendarioOperacionalTable)
            .values({
              data: String(row.data),
              tipo: String(row.tipo).toUpperCase(),
              observacao: row.observacao ? String(row.observacao) : null,
              rede: row.rede ? String(row.rede) : null,
              contaTransporte: row.conta_transporte
                ? Number(row.conta_transporte)
                : null,
              contaKm: row.conta_km ? Number(row.conta_km) : null,
              anoLetivo: Number(row.ano_letivo),
              trimestre: row.trimestre ? Number(row.trimestre) : null,
              criadoEm: agora,
              atualizadoEm: agora,
            })
            .returning();

          registrosProcessados.push({
            id: registro.id,
            data: registro.data,
            tipo: registro.tipo,
          });
        } catch (rowErr) {
          logger.error({ err: rowErr }, `Erro ao processar linha ${i + 2}`);
          erros.push({
            linha: i + 2,
            erro: String(rowErr),
          });
        }
      }

      res.json({
        mensagem: `Importação concluída: ${registrosProcessados.length} registros inseridos`,
        registros_processados: registrosProcessados.length,
        registros_inseridos: registrosProcessados,
        erros: erros.length > 0 ? erros : undefined,
        total_erros: erros.length,
      });
    } catch (err) {
      logger.error({ err }, "Error importing excel");
      res.status(400).json({ error: "Erro ao processar arquivo" });
    }
  }
);

/**
 * POST /calendario-operacional/importar/csv
 * Importa registros a partir de um arquivo CSV
 */
router.post(
  "/calendario-operacional/importar/csv",
  async (req: Request, res: Response) => {
    try {
      if (!req.body.file) {
        return res.status(400).json({ error: "Arquivo não fornecido" });
      }

      const csv = req.body.file;
      const linhas = csv.trim().split("\n");

      if (linhas.length < 2) {
        return res.status(400).json({ error: "Arquivo CSV vazio ou inválido" });
      }

      // Parse header
      const headers = linhas[0]
        .split(",")
        .map((h: string) => h.trim().toLowerCase());

      const agora = new Date().toISOString();
      const registrosProcessados = [];
      const erros = [];

      // Process each line
      for (let i = 1; i < linhas.length; i++) {
        try {
          const valores = linhas[i].split(",").map((v: string) => v.trim());
          const row: ExcelRow = {};

          headers.forEach((header: string, idx: number) => {
            row[header as keyof ExcelRow] = valores[idx];
          });

          // Validar campos obrigatórios
          if (!row.data || !row.tipo || !row.ano_letivo) {
            erros.push({
              linha: i + 1,
              erro: "Data, Tipo e Ano Letivo são obrigatórios",
            });
            continue;
          }

          // Verificar se data já existe
          const [existing] = await db
            .select()
            .from(calendarioOperacionalTable)
            .where(eq(calendarioOperacionalTable.data, String(row.data)));

          if (existing) {
            erros.push({
              linha: i + 1,
              erro: `Data ${row.data} já existe na base de dados`,
            });
            continue;
          }

          // Inserir registro
          const [registro] = await db
            .insert(calendarioOperacionalTable)
            .values({
              data: String(row.data),
              tipo: String(row.tipo).toUpperCase(),
              observacao: row.observacao ? String(row.observacao) : null,
              rede: row.rede ? String(row.rede) : null,
              contaTransporte: row.conta_transporte
                ? Number(row.conta_transporte)
                : null,
              contaKm: row.conta_km ? Number(row.conta_km) : null,
              anoLetivo: Number(row.ano_letivo),
              trimestre: row.trimestre ? Number(row.trimestre) : null,
              criadoEm: agora,
              atualizadoEm: agora,
            })
            .returning();

          registrosProcessados.push({
            id: registro.id,
            data: registro.data,
            tipo: registro.tipo,
          });
        } catch (rowErr) {
          logger.error({ err: rowErr }, `Erro ao processar linha ${i + 1}`);
          erros.push({
            linha: i + 1,
            erro: String(rowErr),
          });
        }
      }

      res.json({
        mensagem: `Importação concluída: ${registrosProcessados.length} registros inseridos`,
        registros_processados: registrosProcessados.length,
        registros_inseridos: registrosProcessados,
        erros: erros.length > 0 ? erros : undefined,
        total_erros: erros.length,
      });
    } catch (err) {
      logger.error({ err }, "Error importing csv");
      res.status(400).json({ error: "Erro ao processar arquivo" });
    }
  }
);

/**
 * GET /calendario-operacional/relatorio/mensal
 * Gera relatório mensal
 */
router.get(
  "/calendario-operacional/relatorio/mensal",
  async (req: Request, res: Response) => {
    try {
      const mes = req.query.mes ? Number(req.query.mes) : new Date().getMonth() + 1;
      const ano = req.query.ano ? Number(req.query.ano) : new Date().getFullYear();

      if (mes < 1 || mes > 12 || ano < 2000) {
        return res.status(400).json({ error: "Mês ou ano inválido" });
      }

      const dataInicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const dataFim = `${ano}-${String(mes).padStart(2, "0")}-31`;

      const registros = await db
        .select()
        .from(calendarioOperacionalTable)
        .where(
          and(
            gte(calendarioOperacionalTable.data, dataInicio),
            lte(calendarioOperacionalTable.data, dataFim)
          )
        )
        .orderBy(calendarioOperacionalTable.data);

      const resumo = {
        diasLetivos: registros.filter((r) => r.tipo === "LETIVO").length,
        feriados: registros.filter((r) => r.tipo === "FERIADO").length,
        recessos: registros.filter((r) => r.tipo === "RECESSO").length,
        pontosFacultativos: registros.filter((r) => r.tipo === "PONTO_FACULTATIVO").length,
        eventosEscolares: registros.filter((r) => r.tipo === "EVENTO_ESCOLAR").length,
        planejamentos: registros.filter((r) => r.tipo === "PLANEJAMENTO").length,
        conselhos: registros.filter((r) => r.tipo === "CONSELHO_DE_CLASSE").length,
        reposicoes: registros.filter((r) => r.tipo === "REPOSICAO").length,
        suspensoes: registros.filter((r) => r.tipo === "SUSPENSAO").length,
      };

      res.json({
        mes,
        ano,
        periodo: `${String(mes).padStart(2, "0")}/${ano}`,
        resumo,
        total_dias_registrados: registros.length,
        detalhes: registros.map((r) => ({
          data: r.data,
          tipo: r.tipo,
          observacao: r.observacao,
          conta_transporte: r.contaTransporte,
          conta_km: r.contaKm,
        })),
      });
    } catch (err) {
      logger.error({ err }, "Error generating monthly report");
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /calendario-operacional/relatorio/anual
 * Gera relatório anual
 */
router.get(
  "/calendario-operacional/relatorio/anual",
  async (req: Request, res: Response) => {
    try {
      const ano = req.query.ano ? Number(req.query.ano) : new Date().getFullYear();

      if (ano < 2000) {
        return res.status(400).json({ error: "Ano inválido" });
      }

      const registros = await db
        .select()
        .from(calendarioOperacionalTable)
        .where(eq(calendarioOperacionalTable.anoLetivo, ano))
        .orderBy(calendarioOperacionalTable.data);

      const resumo = {
        diasLetivos: registros.filter((r) => r.tipo === "LETIVO").length,
        feriados: registros.filter((r) => r.tipo === "FERIADO").length,
        recessos: registros.filter((r) => r.tipo === "RECESSO").length,
        pontosFacultativos: registros.filter((r) => r.tipo === "PONTO_FACULTATIVO").length,
        eventosEscolares: registros.filter((r) => r.tipo === "EVENTO_ESCOLAR").length,
        planejamentos: registros.filter((r) => r.tipo === "PLANEJAMENTO").length,
        conselhos: registros.filter((r) => r.tipo === "CONSELHO_DE_CLASSE").length,
        reposicoes: registros.filter((r) => r.tipo === "REPOSICAO").length,
        suspensoes: registros.filter((r) => r.tipo === "SUSPENSAO").length,
      };

      // Agrupar por mês
      const porMes: Record<number, any> = {};
      for (let m = 1; m <= 12; m++) {
        const mesFiltrado = registros.filter((r) => {
          const dataMes = new Date(r.data).getMonth() + 1;
          return dataMes === m;
        });
        porMes[m] = {
          mes: String(m).padStart(2, "0"),
          diasLetivos: mesFiltrado.filter((r) => r.tipo === "LETIVO").length,
          feriados: mesFiltrado.filter((r) => r.tipo === "FERIADO").length,
          recessos: mesFiltrado.filter((r) => r.tipo === "RECESSO").length,
          total: mesFiltrado.length,
        };
      }

      res.json({
        ano,
        resumo_geral: resumo,
        por_mes: porMes,
        total_dias_registrados: registros.length,
      });
    } catch (err) {
      logger.error({ err }, "Error generating annual report");
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
