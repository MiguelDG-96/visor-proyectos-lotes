import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

for (const h of ['DA4D', 'DA4E']) {
  const e = doc.getEntityByHandle(h);
  console.log(`\n=== Entity ${h} ===`);
  const v = e.getVertices();
  console.log('Vertices:', v);
  // Find texts inside or near
  const nearbyTexts = doc.entities.filter(ent => {
    if (ent.type !== 'TEXT' && ent.type !== 'MTEXT') return false;
    const p = ent.source.startPoint || ent.source.position;
    if (!p) return false;
    return p.x >= v[0][0] - 2 && p.x <= v[2][0] + 2 && p.y >= v[0][1] - 5 && p.y <= v[1][1] + 5;
  });
  console.log('Nearby texts:');
  for (const t of nearbyTexts) {
    console.log(`  [${t.layer}] '${t.source.text}' at (${(t.source.startPoint?.x || t.source.position?.x)?.toFixed(2)}, ${(t.source.startPoint?.y || t.source.position?.y)?.toFixed(2)})`);
  }
}

