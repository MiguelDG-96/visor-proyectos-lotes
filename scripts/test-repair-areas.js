import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';
import { LotExtractor } from '../src/dxf/lot-extractor.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

const extractor = new LotExtractor();

// 1. Check DA92 area
const da92 = doc.getEntityByHandle('DA92');
const v92 = da92.getVertices(); // 5 vertices
const m92 = extractor._calculateMeasurements(v92, true);
console.log('DA92 (Lote 1) Area when closed:', m92.area.toFixed(2), '(PDF says: A=207.26 m2)');

// 2. Check DA4D area
const da4d = doc.getEntityByHandle('DA4D');
const v4d = da4d.getVertices();
const m4d = extractor._calculateMeasurements(v4d, true);
console.log('DA4D (Lote 6) Area when closed:', m4d.area.toFixed(2), '(PDF says: A=257.97 m2)');

// 3. Check DA4E area
const da4e = doc.getEntityByHandle('DA4E');
const v4e = da4e.getVertices();
const m4e = extractor._calculateMeasurements(v4e, true);
console.log('DA4E (Lote 7) Area when closed:', m4e.area.toFixed(2), '(PDF says: A=237.07 m2)');

// 4. Calculate Lot 2 residual polygon between Lot 3 and Lot 1
// Lot 3 (DA51) bottom: (279545.4462, 9335925.2728) -> (279569.8950, 9335925.2728)
// Lot 1 (DA92) top: (279569.8901, 9335918.2728) -> (279546.4850, 9335918.2728)
const lot2Vertices = [
  [279545.4462, 9335925.2728],
  [279569.8950, 9335925.2728],
  [279569.8901, 9335918.2728],
  [279546.4850, 9335918.2728]
];
const m2 = extractor._calculateMeasurements(lot2Vertices, true);
console.log('Lot 2 residual polygon Area:', m2.area.toFixed(2), '(PDF says: A=167.30 m2)');

