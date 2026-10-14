import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

// Check all lines and polylines with Y in [9335917, 9335926] and X in [279540, 279575]
const lot2Entities = doc.entities.filter(e => {
  const pts = e.getVertices();
  return pts.some(p => p[0] >= 279540 && p[0] <= 279575 && p[1] >= 9335917 && p[1] <= 9335926);
});

console.log(`Entities touching Lot 2 space: ${lot2Entities.length}`);
for (const e of lot2Entities) {
  console.log(`  Handle: ${e.handle}, Layer: [${e.layer}], Type: ${e.type}`);
  if (e.type === 'LINE') {
    const v = e.getVertices();
    console.log(`    Line: (${v[0][0].toFixed(4)}, ${v[0][1].toFixed(4)}) -> (${v[1][0].toFixed(4)}, ${v[1][1].toFixed(4)})`);
  } else if (e.type === 'LWPOLYLINE') {
    console.log(`    LWPOLYLINE closed=${e.isClosed()}, count=${e.getVertices().length}`);
  }
}

