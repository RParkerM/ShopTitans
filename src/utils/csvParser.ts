export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current);
        current = '';
      } else if (char === '\r' && next === '\n') {
        row.push(current);
        current = '';
        rows.push(row);
        row = [];
        i++;
      } else if (char === '\n' || char === '\r') {
        row.push(current);
        current = '';
        rows.push(row);
        row = [];
      } else {
        current += char;
      }
    }
  }

  if (row.length > 0 || current) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}
