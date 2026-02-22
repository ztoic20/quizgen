// XLSX importer (offline, no external libs)
// Expected format: Column A = Question, Column B = Correct Answer
// Row 1 may be headers (Question/Answer).
// Requires modern browser support for DecompressionStream (Chrome/Edge/Firefox recent).

async function _dsInflate(data, mode) {
  const ds = new DecompressionStream(mode);
  const stream = new Blob([data]).stream().pipeThrough(ds);
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

function _u16(d, o){ return d[o] | (d[o+1]<<8); }
function _u32(d, o){ return (d[o] | (d[o+1]<<8) | (d[o+2]<<16) | (d[o+3]<<24)) >>> 0; }

function _findEOCD(bytes) {
  // EOCD signature 0x06054b50
  for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 65557; i--) {
    if (bytes[i] === 0x50 && bytes[i+1] === 0x4b && bytes[i+2] === 0x05 && bytes[i+3] === 0x06) return i;
  }
  return -1;
}

async function unzipXLSX(file) {
  const ab = await file.arrayBuffer();
  const bytes = new Uint8Array(ab);

  const eocd = _findEOCD(bytes);
  if (eocd < 0) throw new Error("Invalid XLSX (EOCD not found).");

  const cdSize = _u32(bytes, eocd + 12);
  const cdOff  = _u32(bytes, eocd + 16);

  let p = cdOff;
  const out = new Map();

  while (p < cdOff + cdSize) {
    // Central directory file header signature 0x02014b50
    if (!(bytes[p] === 0x50 && bytes[p+1] === 0x4b && bytes[p+2] === 0x01 && bytes[p+3] === 0x02)) break;

    const compMethod = _u16(bytes, p + 10);
    const compSize = _u32(bytes, p + 20);
    const uncompSize = _u32(bytes, p + 24);
    const nameLen = _u16(bytes, p + 28);
    const extraLen = _u16(bytes, p + 30);
    const commentLen = _u16(bytes, p + 32);
    const localOff = _u32(bytes, p + 42);

    const nameBytes = bytes.slice(p + 46, p + 46 + nameLen);
    const name = new TextDecoder().decode(nameBytes);

    p = p + 46 + nameLen + extraLen + commentLen;

    // Local file header at localOff: signature 0x04034b50
    if (!(bytes[localOff] === 0x50 && bytes[localOff+1] === 0x4b && bytes[localOff+2] === 0x03 && bytes[localOff+3] === 0x04)) {
      continue;
    }
    const lfNameLen = _u16(bytes, localOff + 26);
    const lfExtraLen = _u16(bytes, localOff + 28);
    const dataStart = localOff + 30 + lfNameLen + lfExtraLen;
    const compData = bytes.slice(dataStart, dataStart + compSize);

    let fileData;
    if (compMethod === 0) {
      fileData = compData;
    } else if (compMethod === 8) {
      // Deflate raw
      try {
        fileData = await _dsInflate(compData, "deflate-raw");
      } catch {
        // Some browsers use "deflate"
        fileData = await _dsInflate(compData, "deflate");
      }
    } else {
      // Unsupported
      continue;
    }

    out.set(name, fileData);
  }

  return out;
}

function _xml(u8) {
  const txt = new TextDecoder("utf-8").decode(u8);
  return new DOMParser().parseFromString(txt, "application/xml");
}

function _getText(node) {
  if (!node) return "";
  // For shared strings, <si> can have multiple <t>
  const ts = node.getElementsByTagName("t");
  if (ts && ts.length) {
    let s = "";
    for (const t of ts) s += t.textContent || "";
    return s;
  }
  return node.textContent || "";
}

function _colLetter(cellRef) {
  const m = /^([A-Z]+)\d+$/i.exec(cellRef || "");
  return m ? m[1].toUpperCase() : "";
}

async function parseQuestionsFromXLSX(file) {
  if (!("DecompressionStream" in window)) {
    throw new Error("This browser does not support DecompressionStream required for XLSX import. Use Chrome/Edge, or export as CSV in the future.");
  }

  const files = await unzipXLSX(file);

  const shared = files.get("xl/sharedStrings.xml");
  const sheet1 = files.get("xl/worksheets/sheet1.xml") || files.get("xl/worksheets/sheet.xml");

  if (!sheet1) throw new Error("sheet1.xml not found. Please put questions in the first worksheet.");

  let sharedStrings = [];
  if (shared) {
    const x = _xml(shared);
    const sis = x.getElementsByTagName("si");
    for (const si of sis) sharedStrings.push(_getText(si));
  }

  const sx = _xml(sheet1);
  const rows = sx.getElementsByTagName("row");

  const data = [];
  for (const row of rows) {
    const cells = row.getElementsByTagName("c");
    let q = "", a = "";
    for (const c of cells) {
      const ref = c.getAttribute("r") || "";
      const col = _colLetter(ref);
      if (col !== "A" && col !== "B") continue;

      const t = c.getAttribute("t") || "";
      let v = "";
      if (t === "s") {
        const vNode = c.getElementsByTagName("v")[0];
        const idx = vNode ? parseInt(vNode.textContent || "0", 10) : 0;
        v = sharedStrings[idx] ?? "";
      } else if (t === "inlineStr") {
        const isNode = c.getElementsByTagName("is")[0];
        v = _getText(isNode);
      } else {
        const vNode = c.getElementsByTagName("v")[0];
        v = vNode ? (vNode.textContent || "") : "";
      }

      if (col === "A") q = v;
      if (col === "B") a = v;
    }

    // skip fully empty rows
    if (!String(q).trim() && !String(a).trim()) continue;
    data.push([String(q).trim(), String(a).trim()]);
  }

  if (!data.length) throw new Error("No rows found in columns A and B.");

  // header detection
  const hq = (data[0][0] || "").toLowerCase();
  const ha = (data[0][1] || "").toLowerCase();
  if (hq.includes("question") && (ha.includes("answer") || ha.includes("correct"))) {
    data.shift();
  }

  const questions = data
    .filter(([q,a]) => q && a)
    .map(([q,a], i) => ({
      id: i + 1,
      q,
      a: a.split("|").map(s => s.trim()).filter(Boolean)
    }));

  if (!questions.length) throw new Error("No valid question rows found (need both Question and Answer).");
  return questions;
}


window.parseQuestionsFromXLSX = parseQuestionsFromXLSX;
