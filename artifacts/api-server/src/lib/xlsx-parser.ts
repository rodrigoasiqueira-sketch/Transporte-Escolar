import * as XLSX from "xlsx";

export function parseXlsxBuffer(buffer: Buffer): (string | null)[][] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellText: true, cellDates: false });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];

  // Convert to array of arrays (header + rows), raw values as strings
  const rows: (string | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false, // force everything to string
  }) as (string | null)[][];

  return rows;
}
