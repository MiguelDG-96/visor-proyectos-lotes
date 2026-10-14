import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

// Check DA4D, DA4E, DA92
for (const h of ['DA4D', 'DA4E', 'DA92']) {
  const ent = doc.getEntityByHandle(h);
  console.log(`\n--- Entity [${h}] ---`);
  if (ent) {
    console.log(`Layer: ${ent.layer}, Type: ${ent.type}, Closed: ${ent.isClosed()}`);
    const v = ent.getVertices();
    console.log(`Vertices count: ${v.length}`);
    for (const pt of v) {
      console.log(`  (${pt[0].toFixed(4)}, ${pt[1].toFixed(4)})`);
    }
  }
}

