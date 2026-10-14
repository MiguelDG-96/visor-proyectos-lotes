import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';
import { LotExtractor } from '../src/dxf/lot-extractor.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

const extractor = new LotExtractor();

// Filter lotNumberTexts strictly to 'numero lote'
const numLoteTexts = doc.entities.filter(e => e.layer === 'numero lote');
const mzTexts = doc.entities.filter(e => e.layer === 'textc');

const candidates = extractor.extract(doc);

// Associate numbers strictly from numero lote
for (const cand of candidates) {
  cand.attributes.numeroLote = null;
  cand.attributes.manzana = null;
  if (cand.validation.status === 'valid') {
    for (const textEnt of numLoteTexts) {
      const p = textEnt.source.startPoint || textEnt.source.position;
      if (p && extractor._isPointInPolygon([p.x, p.y], cand.source.vertices)) {
        cand.attributes.numeroLote = String(textEnt.source.text).trim();
        break;
      }
    }
  }
}

// Check lot D1D9
const lotD1D9 = candidates.find(c => c.source.entityHandle === 'D1D9');
console.log('Lot D1D9 attributes after fix:', lotD1D9?.attributes);

// Check total with lot number
const withNum = candidates.filter(c => c.attributes.numeroLote !== null);
console.log(`Lots with valid numeroLote: ${withNum.length} / ${candidates.length}`);

// Associate manzana by finding closest manzana text to lot centroid
for (const cand of candidates) {
  const v = cand.source.vertices;
  if (v.length >= 3) {
    let cx = 0, cy = 0;
    for (const pt of v) { cx += pt[0]; cy += pt[1]; }
    cx /= v.length; cy /= v.length;
    
    let minDist = Infinity;
    let bestMz = null;
    for (const mzEnt of mzTexts) {
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
  }
}

console.log('Lot D1D9 manzana:', lotD1D9?.attributes);
console.log('Sample lots with manzana and numeroLote:');
for (const c of candidates.filter(c => c.attributes.numeroLote && c.attributes.manzana).slice(0, 10)) {
  console.log(`  Handle ${c.source.entityHandle}: Mz: ${c.attributes.manzana}, Lt: ${c.attributes.numeroLote}, Area: ${c.measurements.areaSourceUnitsSquared.toFixed(2)}`);
}

