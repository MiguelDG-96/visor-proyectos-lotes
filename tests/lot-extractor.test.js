import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DxfReader } from '../src/dxf/dxf-reader.js';
import { LotExtractor } from '../src/dxf/lot-extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const realDxfPath = path.resolve(__dirname, '../03- LOTIZACION UNIFICADO.dxf');

describe('LotExtractor Integration Tests', () => {
  const buffer = fs.readFileSync(realDxfPath);
  const reader = new DxfReader();
  const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');
  const extractor = new LotExtractor();
  const candidates = extractor.extract(doc);

  test('Extrae exactamente las 718 polilíneas de la capa LOTES', () => {
    assert.equal(candidates.length, 718);
  });

  test('Clasifica correctamente las formas de cierre y estados de validación', () => {
    const formalClosed = candidates.filter(c => c.validation.closureType === 'formal-closed');
    const probableClosed = candidates.filter(c => c.validation.closureType === 'probable-geometric-closure');
    const openPolylines = candidates.filter(c => c.validation.closureType === 'open' && c.validation.status === 'needs-review');
    const insufficientVertices = candidates.filter(c => c.validation.status === 'invalid');

    assert.equal(formalClosed.length, 658, 'Debe haber 658 cerradas formalmente');
    assert.equal(probableClosed.length, 51, 'Debe haber 51 cierres geométricos probables');
    assert.equal(openPolylines.length, 3, 'Debe haber 3 polilíneas abiertas (DA4D, DA4E, DA92)');
    assert.equal(insufficientVertices.length, 6, 'Debe haber 6 entidades de 2 vértices (inválidas para lotes)');
  });

  test('Entidad D528 tiene cálculo de área 200.0 y perímetro 66.0 sin alterar geometría', () => {
    const d528 = candidates.find(c => c.source.entityHandle === 'D528');
    assert.ok(d528, 'Lote D528 debe existir');
    assert.equal(d528.validation.status, 'valid');
    assert.equal(d528.validation.closureType, 'formal-closed');
    assert.equal(d528.measurements.areaSourceUnitsSquared, 200.0);
    assert.ok(Math.abs(d528.measurements.perimeterSourceUnits - 66.0) < 1e-4);
    assert.equal(d528.measurements.areaM2, null, 'areaM2 debe ser null hasta validación de CRS');
  });

  test('Entidades de dos vértices se marcan con issue INSUFFICIENT_VERTICES', () => {
    const twoPts = candidates.filter(c => c.source.vertices.length === 2);
    assert.equal(twoPts.length, 6);
    for (const item of twoPts) {
      assert.equal(item.validation.status, 'invalid');
      assert.ok(item.validation.issues.some(i => i.code === 'INSUFFICIENT_VERTICES'));
    }
  });

  test('Asocia espacialmente números de lote a los polígonos correspondientes', () => {
    const withLotNumber = candidates.filter(c => c.attributes.numeroLote !== null);
    assert.ok(withLotNumber.length > 500, `Se asociaron exitosamente ${withLotNumber.length} números de lote`);
  });

  test('Lote D1D9 se identifica correctamente con número 18, Manzana MZ-B y área 1335.93 m²', () => {
    const d1d9 = candidates.find(c => c.source.entityHandle === 'D1D9');
    assert.ok(d1d9, 'Lote D1D9 debe existir');
    assert.equal(d1d9.attributes.numeroLote, '18', 'El número de lote debe ser 18, no MZ-B');
    assert.equal(d1d9.attributes.manzana, 'MZ-B', 'La manzana debe ser MZ-B');
    assert.ok(Math.abs(d1d9.measurements.areaSourceUnitsSquared - 1335.93) < 0.1);
  });
});

