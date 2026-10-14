import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';
import { LotExtractor } from '../src/dxf/lot-extractor.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

const extractor = new LotExtractor();
const candidates = extractor.extract(doc);

const allLotNumTexts = doc.entities.filter(
  e => (e.layer === 'numero lote' || e.layer === 'PDF_Text') && (e.source.text || e.source.value)
);

const allMzTexts = doc.entities.filter(
  e => (e.layer === 'textc' || e.layer === 'MANZANEO') && (e.source.text || e.source.value)
);

// Map each candidate
for (const cand of candidates) {
  cand.attributes.numeroLote = null;
  cand.attributes.manzana = null;

  if (cand.validation.status === 'valid') {
    for (const textEnt of allLotNumTexts) {
      const p = textEnt.source.startPoint || textEnt.source.position;
      if (p && extractor._isPointInPolygon([p.x, p.y], cand.source.vertices)) {
        cand.attributes.numeroLote = String(textEnt.source.text).trim();
        break;
      }
    }
  }

  const v = cand.source.vertices;
  if (v.length >= 3) {
    let cx = 0, cy = 0;
    for (const pt of v) { cx += pt[0]; cy += pt[1]; }
    cx /= v.length; cy /= v.length;

    // Northern sector (Y > 9336480)
    if (cy > 9336480) {
      if (cy > 9336570) {
        cand.attributes.manzana = 'Mz - C';
      } else if (cy > 9336520) {
        cand.attributes.manzana = 'Mz - D';
      } else {
        cand.attributes.manzana = cx < 279705 ? 'Mz - A' : 'Mz - B';
      }
      cand.attributes.manzanaColor = 'celeste';
    } else {
      // Southern sector: closest text from 'textc'
      let minDist = Infinity;
      let bestMz = null;
      for (const mzEnt of allMzTexts.filter(m => m.layer === 'textc')) {
        const p = mzEnt.source.startPoint || mzEnt.source.position;
        if (p) {
          const d = Math.hypot(p.x - cx, p.y - cy);
          if (d < minDist) {
            minDist = d;
            bestMz = String(mzEnt.source.text).trim();
          }
        }
      }
      cand.attributes.manzana = bestMz;
      cand.attributes.manzanaColor = 'magenta';
    }
  }
}

// Check sample lots in Mz-C, Mz-D, Mz-A (celeste), Mz-B (celeste)
console.log('Mz - C sample lots:');
const mzc = candidates.filter(c => c.attributes.manzana === 'Mz - C');
console.log(`Total Mz - C: ${mzc.length}, Numbers:`, mzc.map(c => c.attributes.numeroLote).filter(Boolean));

console.log('\nMz - D sample lots:');
const mzd = candidates.filter(c => c.attributes.manzana === 'Mz - D');
console.log(`Total Mz - D: ${mzd.length}, Numbers:`, mzd.map(c => c.attributes.numeroLote).filter(Boolean).sort((a,b) => Number(a)-Number(b)));

console.log('\nMz - A (celeste) sample lots:');
const mza = candidates.filter(c => c.attributes.manzana === 'Mz - A');
console.log(`Total Mz - A (celeste): ${mza.length}, Numbers:`, mza.map(c => c.attributes.numeroLote).filter(Boolean));

console.log('\nMz - B (celeste) sample lots:');
const mzb = candidates.filter(c => c.attributes.manzana === 'Mz - B' && c.attributes.manzanaColor === 'celeste');
console.log(`Total Mz - B (celeste): ${mzb.length}, Numbers:`, mzb.map(c => c.attributes.numeroLote).filter(Boolean));

