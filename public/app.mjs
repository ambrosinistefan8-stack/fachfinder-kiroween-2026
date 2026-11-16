import { bins, evaluateMatch, inventory, searchInventory } from './inventory.mjs';
import { scanPixels } from './scan.mjs';
import { MAX_CSV_BYTES, validateInventoryCSV } from './csv-parser.mjs';

const $ = id => document.getElementById(id);
const state = { item: null, detection: [], scanToken: 0, scanning: false, confirmed: false, imageURL: null };
const historyKey = 'fachfinder.history.v1';
const inventoryKey = 'fachfinder.inventory.v1';
let activeInventory = inventory;
let pendingImport = null;
let importToken = 0;
let history = [];
try {
  const source = localStorage.getItem(inventoryKey);
  if (source) activeInventory = validateInventoryCSV(source, bins).items ?? inventory;
  const saved = JSON.parse(localStorage.getItem(historyKey) ?? '[]');
  if (Array.isArray(saved)) history = saved.filter(entry => activeInventory.some(item => item.id === entry?.id) && Number.isFinite(entry?.at)).slice(0, 6);
} catch { /* A blocked or invalid browser store starts empty. */ }

function toolList() {
  const list = $('tools');
  list.replaceChildren();
  for (const item of searchInventory($('query').value, activeInventory)) {
    const button = document.createElement('button');
    button.className = 'tool-row';
    button.type = 'button';
    button.setAttribute('aria-pressed', String(item.id === state.item?.id));
    const label = document.createElement('span');
    const name = document.createElement('strong');
    const category = document.createElement('small');
    const bin = document.createElement('code');
    name.textContent = item.name;
    category.textContent = `${item.category} · ${item.count} laut Inventar`;
    bin.textContent = item.bin;
    label.append(name, category);
    button.append(label, bin);
    button.addEventListener('click', () => {
      if (state.item?.id !== item.id) state.confirmed = false;
      state.item = item;
      for (const row of list.children) row.setAttribute('aria-pressed', String(row === button));
      updateMatch();
    });
    list.append(button);
  }
  if (!list.childElementCount) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = 'Kein Werkzeug gefunden.';
    list.append(empty);
  }
}

function updateMatch() {
  const ids = [...new Set(state.detection.map(mark => mark.bin))];
  const item = state.item;
  const outcome = evaluateMatch(item, ids).kind;
  let title = 'Werkzeug wählen';
  let detail = 'Das passende Fach erscheint, sobald du ein Werkzeug auswählst.';
  let color = 'idle';
  if (state.scanning) {
    title = 'QR-Markierungen werden gelesen';
    detail = 'Bitte warte kurz.';
  } else if (item) {
    const position = bins[item.bin];
    title = `Fach ${item.bin}`;
    detail = `${item.name} liegt laut Inventar ${position.position} in der ${position.zone}.`;
    if (outcome === 'match') {
      title = state.confirmed ? `Fach ${item.bin} bestätigt` : `Fach ${item.bin} erkannt`;
      detail = `${item.name} · ${position.zone}, ${position.position}.`;
      color = 'success';
    } else if (outcome === 'wrong') {
      detail = `Erkannt: ${ids.join(', ')}. Für ${item.name} suche ${item.bin} (${position.position}).`;
      color = 'attention';
    } else {
      detail += ' Lade ein Foto mit gut sichtbarer QR-Markierung.';
      color = 'attention';
    }
  }
  $('match-title').textContent = title;
  $('match-copy').textContent = detail;
  $('match').className = `match ${color}`;
  $('confirm').hidden = state.scanning || outcome !== 'match' || state.confirmed;

  const marks = $('marks');
  marks.replaceChildren();
  for (const mark of state.detection) {
    const box = document.createElement('div');
    box.className = mark.bin === item?.bin ? 'mark target-mark' : 'mark';
    box.style.left = `${mark.left * 100}%`;
    box.style.top = `${mark.top * 100}%`;
    box.style.width = `${mark.width * 100}%`;
    box.style.height = `${mark.height * 100}%`;
    const label = document.createElement('span');
    label.textContent = mark.bin;
    box.append(label);
    marks.append(box);
  }
}

function renderHistory() {
  $('history').replaceChildren();
  $('empty-history').hidden = history.length > 0;
  $('reset').hidden = !history.length;
  for (const entry of history) {
    const item = activeInventory.find(candidate => candidate.id === entry.id);
    const row = document.createElement('li');
    const name = document.createElement('span');
    const date = document.createElement('time');
    name.textContent = `${item.name} · ${item.bin}`;
    date.dateTime = new Date(entry.at).toISOString();
    date.textContent = new Intl.DateTimeFormat('de-CH', { dateStyle: 'short', timeStyle: 'short' }).format(entry.at);
    row.append(name, date);
    $('history').append(row);
  }
}

function importPreview(record, errors = []) {
  pendingImport = record;
  $('import-preview').hidden = !record;
  const list = $('preview-items');
  const alerts = $('import-error');
  list.replaceChildren();
  alerts.replaceChildren();
  alerts.hidden = !errors.length;
  for (const message of errors.slice(0, 6)) {
    const row = document.createElement('li');
    row.textContent = message;
    alerts.append(row);
  }
  if (!record) return;
  $('preview-summary').textContent = `${record.items.length} gültige Einträge. Beim Bestätigen wird der bisherige Bestätigungsverlauf geleert.`;
  for (const item of record.items.slice(0, 5)) {
    const row = document.createElement('li');
    row.textContent = `${item.name} · ${item.bin} · ${item.count} laut Liste`;
    list.append(row);
  }
}

function showInventoryStatus(saved = true) {
  const source = activeInventory === inventory ? 'Das Beispielinventar' : 'Dein eigenes Inventar';
  $('import-status').textContent = `${source} ist aktiv.${saved ? '' : ' Die Änderung gilt nur bis zum Neuladen.'}`;
  $('reset-inventory').hidden = activeInventory === inventory;
}

function switchInventory(record) {
  importToken += 1;
  let saved = true;
  try {
    if (record) localStorage.setItem(inventoryKey, record.source);
    else localStorage.removeItem(inventoryKey);
  } catch { saved = false; }
  activeInventory = record?.items ?? inventory;
  state.item = null;
  state.confirmed = false;
  history = [];
  $('query').value = '';
  saveHistory();
  importPreview(null);
  showInventoryStatus(saved);
  toolList();
  updateMatch();
}

$('inventory-file').addEventListener('change', async () => {
  const file = $('inventory-file').files[0];
  $('inventory-file').value = '';
  if (!file) return;
  const token = ++importToken;
  importPreview(null);
  if (file.size > MAX_CSV_BYTES) {
    importPreview(null, ['Die Datei ist grösser als 100 KB.']);
    return;
  }
  try {
    const source = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
    if (token !== importToken) return;
    const result = validateInventoryCSV(source, bins);
    if (result.items) importPreview({ source, items: result.items });
    else importPreview(null, result.errors);
  } catch {
    if (token === importToken) importPreview(null, ['Die Datei konnte nicht als UTF-8-CSV gelesen werden.']);
  }
});
$('apply-import').addEventListener('click', () => {
  if (pendingImport) switchInventory(pendingImport);
});
$('cancel-import').addEventListener('click', () => importPreview(null));
$('reset-inventory').addEventListener('click', () => switchInventory(null));

function saveHistory() {
  try { localStorage.setItem(historyKey, JSON.stringify(history)); } catch { /* Session history still works. */ }
  renderHistory();
}

async function loadPhoto(src, filename, alt, fromFile = false) {
  const token = ++state.scanToken;
  if (state.imageURL) URL.revokeObjectURL(state.imageURL);
  state.imageURL = fromFile ? src : null;
  state.detection = [];
  state.scanning = true;
  state.confirmed = false;
  $('photo-name').textContent = filename;
  $('mark-count').textContent = 'Analyse läuft';
  updateMatch();
  const image = $('image');
  image.src = src;
  image.alt = alt;
  try {
    await image.decode();
    await new Promise(requestAnimationFrame);
    if (token !== state.scanToken) return;
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.round(image.naturalWidth * ratio);
    canvas.height = Math.round(image.naturalHeight * ratio);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    state.detection = scanPixels(window.jsQR, context.getImageData(0, 0, canvas.width, canvas.height));
    const count = new Set(state.detection.map(mark => mark.bin)).size;
    $('mark-count').textContent = count === 1 ? '1 Fach erkannt' : `${count} Fächer erkannt`;
  } catch {
    if (token !== state.scanToken) return;
    $('mark-count').textContent = 'Bild konnte nicht ausgewertet werden';
  }
  state.scanning = false;
  updateMatch();
}

$('query').addEventListener('input', toolList);
$('demo').addEventListener('click', () => loadPhoto('./assets/workshop-demo.png', 'Beispielregal', 'Werkstattregal mit QR-markierten Fächern'));
$('single-demo').addEventListener('click', () => loadPhoto('./assets/workshop-closeup.png', 'Einzelfach A-01', 'Beispielfoto mit QR-Markierung von Fach A-01'));
$('photo').addEventListener('change', () => {
  const file = $('photo').files[0];
  $('photo').value = '';
  if (!file) return;
  if (file.size > 18 * 1024 * 1024) {
    $('mark-count').textContent = 'Bitte ein Foto unter 18 MB wählen';
    return;
  }
  loadPhoto(URL.createObjectURL(file), file.name, 'Ausgewähltes Foto des Regals', true);
});
$('confirm').addEventListener('click', () => {
  if (state.confirmed || state.scanning || evaluateMatch(state.item, state.detection.map(mark => mark.bin)).kind !== 'match') return;
  history.unshift({ id: state.item.id, at: Date.now() });
  history = history.slice(0, 6);
  state.confirmed = true;
  saveHistory();
  updateMatch();
  $('match-title').focus();
});
$('reset').addEventListener('click', () => {
  history = [];
  saveHistory();
});

$('match-title').tabIndex = -1;
toolList();
renderHistory();
showInventoryStatus();
loadPhoto('./assets/workshop-demo.png', 'Beispielregal', 'Werkstattregal mit QR-markierten Fächern');
