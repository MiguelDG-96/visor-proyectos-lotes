import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

// Check street positions
const c9 = doc.entities.find(e => e.source.text === 'CALLE 9');
const c10_1 = doc.entities.filter(e => e.source.text === 'CALLE 10');

console.log('CALLE 9 position:', c9?.source.startPoint);
for (const c of c10_1) {
  console.log('CALLE 10 position:', c.source.startPoint);
}

// Check Y ranges of the lots
// Lots in Mz-D have Y between 9336522 and 9336568
// Lots in Mz-C have Y > 9336572
// Lots in Mz-A and Mz-B northern part have Y between 9336490 and 9336518
// In Mz-A/Mz-B northern part: CALLE B separates them at X ~ 279705

