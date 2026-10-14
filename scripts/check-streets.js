import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

const c9 = doc.entities.find(e => (e.source.text || '').includes('CALLE 9'));
const c10 = doc.entities.filter(e => (e.source.text || '').includes('CALLE 10'));

console.log('CALLE 9:', c9?.source.position || c9?.source.startPoint);
for (const c of c10) {
  console.log('CALLE 10:', c.source.position || c.source.startPoint);
}

