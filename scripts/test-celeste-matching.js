import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';
import { LotExtractor } from '../src/dxf/lot-extractor.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

const extractor = new LotExtractor();
const candidates = extractor.extract(doc);

// Numbers from both 'numero lote' and 'PDF_Text'
const allLotNumTexts = doc.entities.filter(
  e => (e.layer === 'numero lote' || e.layer === 'PDF_Text') && (e.source.text || e.source.value)
);
console.log(`Total lot number texts (numero lote + PDF_Text): ${allLotNumTexts.length}`);

// Manzanas from both 'textc' (magenta) and 'MANZANEO' (celeste)
const allMzTexts = doc.entities.filter(
  e => (e.layer === 'textc' || e.layer === 'MANZANEO') && (e.source.text || e.source.value)
);
console.log(`Total manzana texts (textc + MANZANEO): ${allMzTexts.length}`);
for (const m of allMzTexts) {
  const p = m.source.startPoint || m.source.position;
  console.log(`  [${m.layer}] '${m.source.text}' at (${p?.x.toFixed(2)}, ${p?.y.toFixed(2)})`);
}

// Test matching
let matchedCount = 0;
for (const cand of candidates) {
  cand.attributes.numeroLote = null;
  cand.attributes.manzana = null;

  if (cand.validation.status === 'valid') {
    for (const textEnt of allLotNumTexts) {
      const p = textEnt.source.startPoint || textEnt.source.position;
      if (p && extractor._isPointInPolygon([p.x, p.y], cand.source.vertices)) {
        cand.attributes.numeroLote = String(textEnt.source.text).trim();
        matchedCount++;
        break;
      }
    }
  }
}

console.log(`Total candidates with lot number matched: ${matchedCount} / ${candidates.length}`);

// Associate manzanas using closest manzana from allMzTexts
for (const cand of candidates) {
  const v = cand.source.vertices;
  if (v.length >= 3) {
    let cx = 0, cy = 0;
    for (const pt of v) { cx += pt[0]; cy += pt[1]; }
    cx /= v.length; cy /= v.length;

    let minDist = Infinity;
    let bestMz = null;
    let bestLayer = null;

    for (const mzEnt of allMzTexts) {
      const p = mzEnt.source.startPoint || mzEnt.source.position;
      if (p) {
        const d = Math.hypot(p.x - cx, p.y - cy);
        if (d < minDist) {
          minDist = d;
          bestMz = String(mzEnt.source.text).trim();
          bestLayer = mzEnt.layer;
        }
      }
    }
    cand.attributes.manzana = bestMz;
  }
}

// Check northern section lots (e.g. Y > 9336500)
const northLots = candidates.filter(c => {
  const v = c.source.vertices;
  return v.length > 0 && v[0][1] > 9336500;
});

console.log(`Northern section lots (Y > 9336500): ${northLots.length}`);
console.log('Sample northern section lots with matched numbers and manzanas:');
for (const l of northLots.slice(0, 20)) {
  console.log(`  Handle: ${l.source.entityHandle}, Mz: ${l.attributes.manzana}, Lt: ${l.attributes.numeroLote}, Area: ${l.measurements.areaSourceUnitsSquared?.toFixed(2)}`);
}

