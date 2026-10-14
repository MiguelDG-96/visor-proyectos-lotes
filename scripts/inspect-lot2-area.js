import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

// Inspect around DA92:
// X: [279540, 279575], Y: [9335915, 9335940]
const areaEnts = doc.entities.filter(e => {
  const pts = e.getVertices();
  if (pts.length > 0) {
    return pts.some(p => p[0] >= 279540 && p[0] <= 279575 && p[1] >= 9335915 && p[1] <= 9335940);
  }
  const p = e.source.startPoint || e.source.position;
  if (p) {
    return p.x >= 279540 && p.x <= 279575 && p.y >= 9335915 && p.y <= 9335940;
  }
  return false;
});

console.log(`Entities in Lot 1, 2, 3 area: ${areaEnts.length}`);
for (const e of areaEnts) {
  console.log(`  Handle: ${e.handle}, Layer: [${e.layer}], Type: ${e.type}`);
  if (e.type === 'LWPOLYLINE') {
    const v = e.getVertices();
    console.log(`    Polyline: closed=${e.isClosed()}, count=${v.length}`);
    for (const pt of v) {
      console.log(`      (${pt[0].toFixed(4)}, ${pt[1].toFixed(4)})`);
    }
  } else if (e.type === 'TEXT') {
    console.log(`    Text: '${e.source.text}' at (${e.source.startPoint?.x.toFixed(2)}, ${e.source.startPoint?.y.toFixed(2)})`);
  } else if (e.type === 'LINE') {
    const pts = e.getVertices();
    console.log(`    Line: (${pts[0]?.[0].toFixed(2)}, ${pts[0]?.[1].toFixed(2)}) -> (${pts[1]?.[0].toFixed(2)}, ${pts[1]?.[1].toFixed(2)})`);
  }
}

