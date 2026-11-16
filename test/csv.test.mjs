import assert from 'node:assert/strict';
import test from 'node:test';
import { validateInventoryCSV } from '../public/csv-parser.mjs';
import { bins } from '../public/inventory.mjs';

const header = 'id,name,category,bin,count,tags';

test('local inventory accepts Excel-style semicolons, UTF-8 BOM and quoted text', () => {
  const input = '\uFEFFid;name;category;bin;count;tags\r\nmeissel;"Holz; 12 mm";Handwerkzeug;A-01;2;"gross ""neu"""\r\n';
  const result = validateInventoryCSV(input, bins);
  assert.deepEqual(result.items, [{ id: 'meissel', name: 'Holz; 12 mm', category: 'Handwerkzeug', bin: 'A-01', count: 2, tags: 'gross "neu"' }]);
});

test('bad input refuses the entire import', () => {
  const cases = [
    ['Unclosed quote', `${header}\nx,"Holz,Test,A-01,1,z`],
    ['Extra fields', `${header}\nx,Holz,Test,A-01,1,z,x`],
    ['Repeated header', 'id,name,category,bin,count,count\nx,Holz,Test,A-01,1,1'],
    ['Duplicate ID', `${header}\nx,Holz,Test,A-01,1,z\nx,Zange,Test,A-02,1,z`],
    ['Bad count', `${header}\nx,Holz,Test,A-01,1x,z`],
    ['Bad location', `${header}\nx,Holz,Test,__proto__,1,z`]
  ];
  for (const [label, csv] of cases) assert.equal(validateInventoryCSV(csv, bins).items, null, label);
});

test('blank, oversized and excessive files are rejected', () => {
  for (const csv of [header, '☕'.repeat(40_000), header + '\n' + Array.from({ length: 201 }, (_, id) => `${id},Zange,Tool,A-01,1,z`).join('\n')]) {
    assert.equal(validateInventoryCSV(csv, bins).items, null);
  }
});
