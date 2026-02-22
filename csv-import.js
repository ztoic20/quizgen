// CSV importer (offline)
// Expected: Column 1 = Question, Column 2 = Correct Answer
// Row 1 may be headers. Supports quoted CSV with commas/newlines.

function _parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i+1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      } else {
        field += c; i++; continue;
      }
    } else {
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { row.push(field); field = ""; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') {
        row.push(field); field = "";
        rows.push(row); row = [];
        i++; continue;
      }
      field += c; i++; continue;
    }
  }
  row.push(field);
  rows.push(row);
  return rows;
}

async function parseQuestionsFromCSV(file) {
  const text = await file.text();
  const rows = _parseCSV(text)
    .map(r => [ (r[0] ?? "").trim(), (r[1] ?? "").trim() ])
    .filter(([q,a]) => q || a);

  if (!rows.length) throw new Error("CSV looks empty.");

  const hq = (rows[0][0] || "").toLowerCase();
  const ha = (rows[0][1] || "").toLowerCase();
  if (hq.includes("question") && (ha.includes("answer") || ha.includes("correct"))) rows.shift();

  const qs = rows
    .filter(([q,a]) => q && a)
    .map(([q,a], idx) => ({
      id: idx + 1,
      q,
      a: a.split("|").map(s => s.trim()).filter(Boolean)
    }));

  if (!qs.length) throw new Error("No valid rows found. Make sure Column 1 = Question and Column 2 = Answer.");
  return qs;
}

window.parseQuestionsFromCSV = parseQuestionsFromCSV;
