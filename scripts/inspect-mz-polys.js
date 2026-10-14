import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

const mzPolys = doc.entities.filter(e => (e.layer === 'manzanas' || e.layer === 'MANZANAS-ORIGINALES') && e.type === 'LWPOLYLINE');
console.log(`Manzana polylines: ${mzPolys.length}`);
for (const p of mzPolys.slice(0, 5)) {
  console.log(`  Handle: ${p.handle}, Layer: ${p.layer}, Closed: ${p.isClosed()}, Vertices: ${p.getVertices().length}`);
}

const mzTexts = doc.entities.filter(e => e.layer === 'textc' && e.source.text);
console.log(`Manzana texts: ${mzTexts.length}`);
for (const t of mzTexts.slice(0, 5)) {
  const p = t.source.startPoint || t.source.position;
  console.log(`  Text: ${t.source.text} at (${p?.x.toFixed(2)}, ${p?.y.toFixed(2)})`);
}

