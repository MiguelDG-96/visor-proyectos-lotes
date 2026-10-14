import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';
import { LotExtractor } from '../src/dxf/lot-extractor.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

const numLoteTexts = doc.entities.filter(e => e.layer === 'numero lote');
console.log(`Texts in 'numero lote': ${numLoteTexts.length}`);

// Check entity 18 near MZ-B
const ent18 = numLoteTexts.find(e => e.source.text === '18' && e.source.startPoint?.x > 279650 && e.source.startPoint?.x < 279660);
console.log('Text 18 entity:', ent18?.toJSON());

// Find candidate containing (279654.91, 9336471.06)
const pt18 = [279654.91, 9336471.06];
const extractor = new LotExtractor();
const candidates = extractor.extract(doc);

const lot18 = candidates.find(c => extractor._isPointInPolygon(pt18, c.source.vertices));
console.log('Lot containing text 18:', lot18 ? {
  id: lot18.id,
  handle: lot18.source.entityHandle,
  layer: lot18.source.layer,
  area: lot18.measurements.areaSourceUnitsSquared,
  currentNumeroLote: lot18.attributes.numeroLote
} : 'Not found');

