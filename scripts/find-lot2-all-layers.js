import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

// Search for any entity on any layer with vertices near the boundaries of Lot 2
const candEnts = doc.entities.filter(e => {
  if (e.type === 'TEXT' || e.type === 'MTEXT') return false;
  const pts = e.getVertices();
  return pts.some(p => p[0] >= 279544 && p[0] <= 279572 && p[1] >= 9335917 && p[1] <= 9335926);
});

console.log(`Entities with geometry in Lot 2 zone (across ALL layers): ${candEnts.length}`);
for (const e of candEnts) {
  console.log(`  Handle: ${e.handle}, Layer: [${e.layer}], Type: ${e.type}`);
  for (const pt of e.getVertices()) {
    console.log(`    (${pt[0].toFixed(4)}, ${pt[1].toFixed(4)})`);
  }
}

