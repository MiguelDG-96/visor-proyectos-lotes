import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DxfReader } from '../src/dxf/dxf-reader.js';
import { ValidatePolygon } from '../src/validation/validate-polygon.js';
import { GeometryRepairEngine } from '../src/geometry/geometry-repair.js';
import { LotExtractor } from '../src/dxf/lot-extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, 'fixtures');
const realDxfPath = path.resolve(__dirname, '../03- LOTIZACION UNIFICADO.dxf');

describe('Validation and Auditable Repair Test Suite', () => {
  const reader = new DxfReader();

  test('Fixture 1: Polilínea cerrada válida se clasifica como formal-closed y válida', () => {
    const doc = reader.read(fs.readFileSync(path.join(fixturesDir, 'valid-closed-polyline.dxf')));
    const poly = doc.entities[0];
    const val = ValidatePolygon.validate(poly.getVertices(), { isFormallyClosed: poly.isClosed() });

    assert.equal(val.status, 'valid');
    assert.equal(val.closureType, 'formal-closed');
    assert.equal(val.area, 200.0);
    assert.equal(val.perimeter, 60.0);
  });

  test('Fixture 2: Polilínea abierta se clasifica como needs-review con código OPEN_POLYLINE', () => {
    const doc = reader.read(fs.readFileSync(path.join(fixturesDir, 'open-polyline.dxf')));
    const poly = doc.entities[0];
    const val = ValidatePolygon.validate(poly.getVertices(), { isFormallyClosed: poly.isClosed() });

    assert.equal(val.status, 'needs-review');
    assert.equal(val.closureType, 'open');
    assert.ok(val.issues.some(i => i.code === 'OPEN_POLYLINE'));
  });

  test('Fixture 3: Primer y último punto coincidentes se clasifica como probable-geometric-closure', () => {
    const doc = reader.read(fs.readFileSync(path.join(fixturesDir, 'repeated-first-last-point.dxf')));
    const poly = doc.entities[0];
    const val = ValidatePolygon.validate(poly.getVertices(), { isFormallyClosed: poly.isClosed() });

    assert.equal(val.status, 'valid');
    assert.equal(val.closureType, 'probable-geometric-closure');
    assert.ok(val.issues.some(i => i.code === 'PROBABLE_GEOMETRIC_CLOSURE'));
  });

  test('Fixture 4: Entidad de dos vértices se clasifica como inválida con INSUFFICIENT_VERTICES', () => {
    const doc = reader.read(fs.readFileSync(path.join(fixturesDir, 'two-vertex-polyline.dxf')));
    const poly = doc.entities[0];
    const val = ValidatePolygon.validate(poly.getVertices(), { isFormallyClosed: poly.isClosed() });

    assert.equal(val.status, 'invalid');
    assert.ok(val.issues.some(i => i.code === 'INSUFFICIENT_VERTICES'));
  });

  test('Fixture 5: Polígono autointersectado se clasifica como inválido con SELF_INTERSECTING', () => {
    const doc = reader.read(fs.readFileSync(path.join(fixturesDir, 'self-intersecting-polygon.dxf')));
    const poly = doc.entities[0];
    const val = ValidatePolygon.validate(poly.getVertices(), { isFormallyClosed: poly.isClosed() });

    assert.equal(val.status, 'invalid');
    assert.ok(val.issues.some(i => i.code === 'SELF_INTERSECTING'));
  });

  test('Plano Real: Reparación auditable de DA92 (Lote 1, brecha 1.6 cm) alcanza 207.26 m²', () => {
    const realDoc = reader.read(fs.readFileSync(realDxfPath));
    const extractor = new LotExtractor({ closureTolerance: 0.03 });
    const candidates = extractor.extract(realDoc);
    const lot1 = candidates.find(c => c.source.entityHandle === 'DA92');

    assert.ok(lot1, 'Lote DA92 debe existir');
    const repairEngine = new GeometryRepairEngine();
    repairEngine.repairSnapClosure(lot1, 0.0162);

    assert.equal(lot1.validation.status, 'valid');
    assert.ok(Math.abs(lot1.measurements.areaSourceUnitsSquared - 207.26) < 0.1);

    const audit = repairEngine.getAuditTrail();
    assert.ok(audit.some(e => e.entityHandle === 'DA92' && e.operation === 'SNAP_CLOSURE'));
  });

  test('Plano Real: Reparación auditable de DA4D (Lote 6) y DA4E (Lote 7) alcanza áreas del PDF', () => {
    const realDoc = reader.read(fs.readFileSync(realDxfPath));
    const extractor = new LotExtractor();
    const candidates = extractor.extract(realDoc);

    const lot6 = candidates.find(c => c.source.entityHandle === 'DA4D');
    const lot7 = candidates.find(c => c.source.entityHandle === 'DA4E');

    const repairEngine = new GeometryRepairEngine();
    repairEngine.repairOpenEndpoints(lot6, 'Cierre de frente posterior abierto');
    repairEngine.repairOpenEndpoints(lot7, 'Cierre de frente posterior abierto');

    assert.ok(Math.abs(lot6.measurements.areaSourceUnitsSquared - 257.97) < 0.1);
    assert.ok(Math.abs(lot7.measurements.areaSourceUnitsSquared - 237.07) < 0.1);
  });

  test('Plano Real: Reconstrucción auditable del Lote 2 genera polígono con área ~167.30 m²', () => {
    const realDoc = reader.read(fs.readFileSync(realDxfPath));
    const extractor = new LotExtractor();
    const candidates = extractor.extract(realDoc);

    const lot3 = candidates.find(c => c.source.entityHandle === 'DA51');
    const lot1 = candidates.find(c => c.source.entityHandle === 'DA92');

    const repairEngine = new GeometryRepairEngine();
    const reconLot2 = repairEngine.reconstructLot2(lot3, lot1);

    assert.equal(reconLot2.attributes.numeroLote, '2');
    assert.ok(Math.abs(reconLot2.measurements.areaSourceUnitsSquared - 167.49) < 0.5);

    const audit = repairEngine.getAuditTrail();
    assert.ok(audit.some(e => e.entityHandle === 'RECON-LT2' && e.operation === 'RECONSTRUCT_MISSING_LOT'));
  });
});

