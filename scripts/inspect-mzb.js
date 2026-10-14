import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

// Find text MZ-B
const mzbText = doc.entities.find(e => e.source.text && e.source.text.includes('MZ-B'));
console.log('MZ-B entity:', mzbText?.toJSON());

if (mzbText) {
  const pos = mzbText.source.startPoint || mzbText.source.position;
  console.log('MZ-B position:', pos);
  
  // Find all texts within 25m of MZ-B
  const nearbyTexts = doc.entities.filter(e => {
    if (e.type !== 'TEXT' && e.type !== 'MTEXT') return false;
    const p = e.source.startPoint || e.source.position;
    if (!p) return false;
    const dx = p.x - pos.x;
    const dy = p.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) < 25;
  });
  
  console.log(`Nearby texts (${nearbyTexts.length}):`);
  for (const t of nearbyTexts) {
    console.log(`  [${t.layer}] '${t.source.text}' at (${t.source.startPoint?.x.toFixed(2)}, ${t.source.startPoint?.y.toFixed(2)})`);
  }
}

