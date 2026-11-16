const columns = ['id', 'name', 'category', 'bin', 'count', 'tags'];
export const MAX_CSV_BYTES = 100 * 1024;
const MAX_ENTRIES = 200;

// Kiro proposed the row/field parser. Review added strict quote validation.
export function parseCSV(input) {
  const text = input.replace(/^\uFEFF/, '');
  const delimiter = (text.split(/\r\n|\r|\n/, 1)[0] ?? '').includes(';') ? ';' : ',';
  const rows = [];
  let row = [];
  let field = '';
  let state = 'field';

  function endField() {
    row.push(field);
    field = '';
    state = 'field';
  }

  function endRow() {
    endField();
    if (row.some(value => value.trim())) rows.push(row);
    row = [];
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (state === 'quoted') {
      if (char !== '"') {
        field += char;
      } else if (next === '"') {
        field += '"';
        index += 1;
      } else {
        state = 'closed';
      }
      continue;
    }

    if (char === delimiter) {
      endField();
    } else if (char === '\r' || char === '\n') {
      endRow();
      if (char === '\r' && next === '\n') index += 1;
    } else if (state === 'closed' || (char === '"' && field !== '')) {
      throw new Error('Ein Anführungszeichen steht an einer ungültigen Stelle.');
    } else if (char === '"') {
      state = 'quoted';
    } else {
      field += char;
    }
  }

  if (state === 'quoted') throw new Error('Ein Anführungszeichen wurde nicht geschlossen.');
  if (row.length || field || state === 'closed') endRow();
  return { headers: rows.shift()?.map(value => value.trim()) ?? [], rows };
}

export function validateInventoryCSV(text, bins) {
  if (new TextEncoder().encode(text).length > MAX_CSV_BYTES) {
    return { items: null, errors: ['Die Datei ist grösser als 100 KB.'] };
  }

  let parsed;
  try {
    parsed = parseCSV(text);
  } catch (error) {
    return { items: null, errors: [error.message] };
  }

  const { headers, rows } = parsed;
  if (headers.length !== columns.length || new Set(headers).size !== columns.length || !columns.every(key => headers.includes(key))) {
    return { items: null, errors: [`Erwartete Spalten: ${columns.join(', ')}. Jede Spalte muss genau einmal vorkommen.`] };
  }
  if (rows.length === 0 || rows.length > MAX_ENTRIES) {
    return { items: null, errors: [`Die Liste muss 1 bis ${MAX_ENTRIES} Einträge enthalten.`] };
  }

  const field = Object.fromEntries(columns.map(key => [key, headers.indexOf(key)]));
  const errors = [];
  const items = [];
  const ids = new Set();
  for (const [index, row] of rows.entries()) {
    if (row.length !== headers.length) {
      errors.push(`Eintrag ${index + 1} hat ${row.length} statt ${headers.length} Felder.`);
      continue;
    }
    const item = Object.fromEntries(columns.map(key => [key, row[field[key]].trim()]));
    const { id, name, category, bin, count, tags } = item;
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) errors.push(`Eintrag ${index + 1} hat keine gültige ID.`);
    if (ids.has(id)) errors.push(`Eintrag ${index + 1} verwendet die ID ${id} doppelt.`);
    if (!name || name.length > 120 || !category || category.length > 80 || tags.length > 240) errors.push(`Eintrag ${index + 1} hat ungültige Angaben zu Name, Kategorie oder Suchbegriffen.`);
    if (!Object.hasOwn(bins, bin)) errors.push(`Eintrag ${index + 1} verwendet ein unbekanntes Fach.`);
    if (!/^\d{1,6}$/.test(count) || Number(count) < 1) errors.push(`Eintrag ${index + 1} benötigt eine ganze Anzahl von 1 bis 999999.`);
    ids.add(id);
    items.push({ id, name, category, bin, count: Number(count), tags });
  }
  return errors.length ? { items: null, errors } : { items, errors };
}
