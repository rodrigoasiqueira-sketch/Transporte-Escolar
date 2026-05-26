import * as fs from "fs";
import * as path from "path";
import * as zip from "node:zlib";

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const siRegex = /<si>([\s\S]*?)<\/si>/g;
  const tRegex = /<t[^>]*>([\s\S]*?)<\/t>/g;
  let siMatch;
  while ((siMatch = siRegex.exec(xml)) !== null) {
    const siContent = siMatch[1];
    const texts: string[] = [];
    let tMatch;
    tRegex.lastIndex = 0;
    while ((tMatch = tRegex.exec(siContent)) !== null) {
      texts.push(tMatch[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'"));
    }
    strings.push(texts.join(""));
  }
  return strings;
}

function colToIndex(col: string): number {
  let result = 0;
  for (const ch of col.toUpperCase()) {
    result = result * 26 + (ch.charCodeAt(0) - 64);
  }
  return result - 1;
}

function parseSheet(xml: string, strings: string[]): (string | null)[][] {
  const rows: (string | null)[][] = [];
  const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g;
  const cellRegex = /<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g;
  const vRegex = /<v>([\s\S]*?)<\/v>/;
  const isRegex = /<is><t[^>]*>([\s\S]*?)<\/t><\/is>/;

  let rowMatch;
  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rowContent = rowMatch[1];
    const rowNum = parseInt(rowMatch[0].match(/r="(\d+)"/)![1]) - 1;
    
    while (rows.length <= rowNum) rows.push([]);
    
    let cellMatch;
    cellRegex.lastIndex = 0;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const col = cellMatch[1];
      const t = cellMatch[3];
      const content = cellMatch[4];
      const colIdx = colToIndex(col);
      
      while (rows[rowNum].length <= colIdx) rows[rowNum].push(null);
      
      const isStr = isRegex.exec(content);
      if (isStr) {
        rows[rowNum][colIdx] = isStr[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
        continue;
      }
      
      const vMatch = vRegex.exec(content);
      if (vMatch) {
        if (t.includes('t="s"')) {
          rows[rowNum][colIdx] = strings[parseInt(vMatch[1])] ?? null;
        } else {
          rows[rowNum][colIdx] = vMatch[1];
        }
      } else {
        rows[rowNum][colIdx] = null;
      }
    }
  }
  return rows;
}

export function parseXlsxBuffer(buffer: Buffer): (string | null)[][] {
  // Use JSZip-free approach: unzip manually using Node's built-in zip
  // We use a simple ZIP parsing approach
  const AdmZip = (() => {
    try {
      // Try to use a simple zip reader
      return null;
    } catch {
      return null;
    }
  })();

  // Parse ZIP format manually
  const files = readZip(buffer);
  
  const sharedStrings = files["xl/sharedStrings.xml"] 
    ? parseSharedStrings(files["xl/sharedStrings.xml"]) 
    : [];
  
  const sheet = files["xl/worksheets/sheet1.xml"];
  if (!sheet) return [];
  
  return parseSheet(sheet, sharedStrings);
}

function readZip(buffer: Buffer): Record<string, string> {
  const files: Record<string, string> = {};
  let offset = 0;
  
  while (offset < buffer.length - 4) {
    // Local file header signature = 0x04034b50
    if (buffer[offset] !== 0x50 || buffer[offset + 1] !== 0x4b || 
        buffer[offset + 2] !== 0x03 || buffer[offset + 3] !== 0x04) {
      break;
    }
    
    const compression = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    
    const fileName = buffer.slice(offset + 30, offset + 30 + fileNameLength).toString("utf8");
    const dataOffset = offset + 30 + fileNameLength + extraLength;
    const compressedData = buffer.slice(dataOffset, dataOffset + compressedSize);
    
    try {
      let content: Buffer;
      if (compression === 0) {
        content = compressedData;
      } else if (compression === 8) {
        content = require("zlib").inflateRawSync(compressedData);
      } else {
        offset = dataOffset + compressedSize;
        continue;
      }
      files[fileName] = content.toString("utf8");
    } catch {
      // skip
    }
    
    offset = dataOffset + compressedSize;
  }
  
  return files;
}
