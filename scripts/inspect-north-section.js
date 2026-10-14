import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

// Northern bounding box
// X: [279600, 279850], Y: [9336500, 9336650]
const northEnts = doc.entities.filter(e => {
  const pts = e.getVertices();
  if (pts.length > 0) {
    const x = pts[0][0];
    const y = pts[0][1];
    return x >= 279600 && x <= 279850 && y >= 9336500 && y <= 9336650;
  }
  const p = e.source.startPoint || e.source.position;
  if (p) {
    return p.x >= 279600 && p.x <= 279850 && p.y >= 9336500 && p.y <= 9336650;
  }
  return false;
});

console.log(`Total entities in northern region: ${northEnts.length}`);

// Group by layer and type
const byLayer = {};
for (const e of northEnts) {
  const k = `${e.layer} (${e.type})`;
  byLayer[k] = (byLayer[k] || 0) + 1;
}

console.log('Entities in northern region by Layer (Type):');
for (const [k, count] of Object.entries(byLayer).sort((a,b) => b[1] - a[1])) {
  console.log(`  ${k}: ${count}`);
}

// Check all texts in PDF_Text
console.log('\n--- All texts in PDF_Text ---');
const pdfTexts = doc.entities.filter(e => e.layer === 'PDF_Text');
for (const t of pdfTexts) {
  const p = t.source.startPoint || t.source.position;
  console.log(`  Handle: ${t.handle}, Text: '${t.source.text}' at (${p?.x.toFixed(2)}, ${p?.y.toFixed(2)})`);
}

