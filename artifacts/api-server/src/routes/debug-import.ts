import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Temporary debug endpoint — shows headers + first 3 rows of an xlsx upload
router.post("/debug/import-preview", async (req, res) => {
  try {
    const fileBuffer = Buffer.from(req.body.fileBase64 as string, "base64");
    const { parseXlsxBuffer } = await import("../lib/xlsx-parser.js");
    const rows = parseXlsxBuffer(fileBuffer);

    if (!rows || rows.length === 0) {
      return res.json({ error: "Nenhuma linha encontrada no arquivo", rows: [] });
    }

    res.json({
      totalRows: rows.length,
      headers: rows[0],
      sample: rows.slice(1, 4),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
