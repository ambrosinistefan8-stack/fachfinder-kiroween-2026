export const bins = {
  'A-01': { zone: 'Montage', position: 'oben links' },
  'A-02': { zone: 'Montage', position: 'oben Mitte' },
  'A-03': { zone: 'Holzwerkstatt', position: 'oben rechts' },
  'B-01': { zone: 'Montage', position: 'unten links' },
  'B-02': { zone: 'Holzwerkstatt', position: 'unten Mitte' },
  'B-03': { zone: 'Holzwerkstatt', position: 'unten rechts' }
};

export const inventory = [
  { id: 'hex', name: 'Inbusschlüssel 5 mm', category: 'Handwerkzeug', tags: 'imbus allen hex schlüssel', bin: 'A-02', count: 4 },
  { id: 'pliers', name: 'Kombizange', category: 'Handwerkzeug', tags: 'zange kombination', bin: 'A-01', count: 2 },
  { id: 'drill', name: 'Holzbohrer 6 mm', category: 'Bohrer', tags: 'bohrspitze holz', bin: 'A-03', count: 3 },
  { id: 'gloves', name: 'Arbeitshandschuhe', category: 'Schutzausrüstung', tags: 'handschuh grösse m', bin: 'B-01', count: 6 },
  { id: 'tape', name: 'Massband 3 m', category: 'Messwerkzeug', tags: 'maßband meter massstab', bin: 'B-02', count: 2 },
  { id: 'sand', name: 'Schleifpapier P120', category: 'Verbrauchsmaterial', tags: 'sandpapier körnung', bin: 'B-03', count: 12 }
];

function normalize(value) {
  return value.toLowerCase().replaceAll('ß', 'ss').normalize('NFD').replace(/\p{M}/gu, '');
}

export function searchInventory(query, items = inventory) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return items.filter(item => {
    const searchable = normalize(`${item.name} ${item.category} ${item.tags} ${item.bin}`);
    return words.every(word => searchable.includes(word));
  });
}

export function markerBin(payload) {
  const match = /^FACHFINDER:([AB]-0[1-3])$/.exec(payload);
  return match?.[1] ?? null;
}

export function evaluateMatch(item, detected) {
  if (!item) return { kind: 'idle' };
  if (detected.includes(item.bin)) return { kind: 'match' };
  if (detected.length) return { kind: 'wrong' };
  return { kind: 'missing' };
}
