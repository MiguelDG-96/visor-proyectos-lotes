import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DxfReader } from '../src/dxf/dxf-reader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const realDxfPath = path.resolve(__dirname, '../03- LOTIZACION UNIFICADO.dxf');

describe('DxfReader & CadDocument Integration Tests', () => {
  const buffer = fs.readFileSync(realDxfPath);
  const reader = new DxfReader();
  const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

  test('Preserva el 100% de las 7,759 entidades del DXF real', () => {
    assert.equal(doc.entities.length, 7759);
  });

  test('Preserva variables clave del encabezado DXF', () => {
    assert.equal(doc.header.$ACADVER, 'AC1018');
    assert.equal(doc.header.$INSUNITS, 1);
    assert.equal(doc.header.$MEASUREMENT, 0);
  });

  test('Identifica las 29 capas existentes', () => {
    assert.equal(doc.layers.size, 29);
    assert.ok(doc.layers.has('LOTES'));
    assert.ok(doc.layers.has('manzanas'));
    assert.ok(doc.layers.has('circulos'));
    assert.ok(doc.layers.has('Cotas'));
  });

  test('Preserva la entidad específica D528 con exactitud matemática', () => {
    const d528 = doc.getEntityByHandle('D528');
    assert.ok(d528, 'Entidad D528 debe existir');
    assert.equal(d528.type, 'LWPOLYLINE');
    assert.equal(d528.layer, 'LOTES');
    assert.equal(d528.isClosed(), true);

    const vertices = d528.getVertices();
    assert.equal(vertices.length, 4);

    // Vértice 0
    assert.ok(Math.abs(vertices[0][0] - 279633.0594985) < 1e-4);
    assert.ok(Math.abs(vertices[0][1] - 9336209.2980421) < 1e-4);

    // Dimensiones del lote: 8m x 25m
    const dx = Math.abs(vertices[1][0] - vertices[0][0]);
    const dy = Math.abs(vertices[2][1] - vertices[1][1]);
    assert.ok(Math.abs(dx - 8.0) < 1e-4);
    assert.ok(Math.abs(dy - 25.0) < 1e-4);
  });

  test('Inmutabilidad: no permite mutar la geometría fuente de las entidades', () => {
    const d528 = doc.getEntityByHandle('D528');
    assert.throws(() => {
      // Intentar modificar directamente un objeto congelado
      d528.source.vertices[0][0] = 999999.0;
    }, TypeError);
  });

  test('Preserva las entidades no soportadas nativamente por dxf-parser (HATCH, OLE2FRAME, VIEWPORT)', () => {
    const hatches = doc.entities.filter(e => e.type === 'HATCH');
    const oleFrames = doc.entities.filter(e => e.type === 'OLE2FRAME');
    const viewports = doc.entities.filter(e => e.type === 'VIEWPORT');

    assert.equal(hatches.length, 6, 'Debe preservar los 6 HATCH');
    assert.equal(oleFrames.length, 4, 'Debe preservar los 4 OLE2FRAME');
    assert.equal(viewports.length, 2, 'Debe preservar los 2 VIEWPORT');
  });

  test('Preserva los 635 círculos de numeración con radio ~1.25m (1.2484m)', () => {
    const circles = doc.entities.filter(e => e.layer === 'circulos' && e.type === 'CIRCLE');
    assert.equal(circles.length, 635);
    for (const c of circles) {
      assert.ok(Math.abs(c.source.radius - 1.2484235) < 1e-4);
    }
  });
});
