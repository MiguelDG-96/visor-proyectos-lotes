import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { exportCadInventoryJson } from '../src/export/export-cad-inventory-json.js';
import { exportLotsJson } from '../src/export/export-lots-json.js';
import { exportGeoJson } from '../src/export/export-geojson.js';
import { exportLotsCsv } from '../src/export/export-csv.js';
import { exportReport } from '../src/export/export-report.js';

describe('Export Modules Test Suite (Fase 6 & 7)', () => {
  const dummyLot = {
    id: 'lot-TEST1',
    source: {
      file: '03- LOTIZACION UNIFICADO.dxf',
      entityHandle: 'DA92',
      entityType: 'LWPOLYLINE',
      layer: 'LOTES',
      closedFlag: false,
      vertices: [
        [279560.0, 9335900.0],
        [279570.0, 9335900.0],
        [279570.0, 9335920.0],
        [279560.0, 9335920.0]
      ]
    },
    validation: {
      status: 'repaired',
      closureType: 'snap-closure',
      issues: []
    },
    measurements: {
      areaSourceUnitsSquared: 200.0,
      perimeterSourceUnits: 60.0,
      areaM2: 199.92,
      scaleFactorK: 1.00021
    },
    attributes: {
      manzana: 'MZ-Z',
      numeroLote: '1',
      manzanaColor: 'rosado',
      reconstructed: false
    },
    correctedGeometry: {
      closureType: 'snap-closure',
      isClosed: true,
      vertices: [
        [279560.0, 9335900.0],
        [279570.0, 9335900.0],
        [279570.0, 9335920.0],
        [279560.0, 9335920.0],
        [279560.0, 9335900.0]
      ]
    },
    georeferencing: {
      status: 'certified',
      datum: 'WGS 84',
      sourceCrs: 'EPSG:32718 (UTM 18S)',
      targetCrs: 'EPSG:4326',
      convergenceDeg: -0.27,
      coordinatesGeoJson: [
        [-76.9915, -6.0020],
        [-76.9914, -6.0020],
        [-76.9914, -6.0018],
        [-76.9915, -6.0018],
        [-76.9915, -6.0020]
      ],
      centroidGeo: { lat: -6.0019, lon: -76.99145 }
    }
  };

  test('exportCadInventoryJson exporta estructura completa y preserva capas', () => {
    const doc = {
      metadata: { filename: 'test.dxf', version: 'AC1018' },
      totalEntities: 100,
      layers: { LOTES: { count: 50 }, VIAS: { count: 50 } },
      blocks: { B1: {} }
    };
    const jsonStr = exportCadInventoryJson(doc);
    const parsed = JSON.parse(jsonStr);

    assert.equal(parsed.metadata.sourceFile, 'test.dxf');
    assert.equal(parsed.metadata.totalEntitiesPreserved, 100);
    assert.equal(parsed.layers.LOTES.count, 50);
  });

  test('exportLotsJson preserva source.vertices inmutables y refleja estado de reparación', () => {
    const originalVerts = JSON.stringify(dummyLot.source.vertices);
    const jsonStr = exportLotsJson([dummyLot]);
    const parsed = JSON.parse(jsonStr);

    // Comprobar que source.vertices no ha mutado
    assert.equal(JSON.stringify(dummyLot.source.vertices), originalVerts);
    assert.equal(parsed.candidates.length, 1);
    assert.equal(parsed.candidates[0].source.entityHandle, 'DA92');
    assert.equal(parsed.candidates[0].attributes.manzana, 'MZ-Z');
    assert.equal(parsed.candidates[0].correctedGeometry.closureType, 'snap-closure');
  });

  test('exportGeoJson genera FeatureCollection RFC 7946 con anillo cerrado y coordenadas [lon, lat]', () => {
    const geoJsonStr = exportGeoJson([dummyLot]);
    const parsed = JSON.parse(geoJsonStr);

    assert.equal(parsed.type, 'FeatureCollection');
    assert.equal(parsed.features.length, 1);

    const feat = parsed.features[0];
    assert.equal(feat.type, 'Feature');
    assert.equal(feat.geometry.type, 'Polygon');
    assert.equal(feat.properties.manzana, 'MZ-Z');
    assert.equal(feat.properties.numeroLote, '1');
    assert.equal(feat.properties.areaM2, 199.92);

    const ring = feat.geometry.coordinates[0];
    assert.ok(ring.length >= 4);
    // Verificar que primer vértice es idéntico al último (anillo cerrado)
    assert.deepEqual(ring[0], ring[ring.length - 1]);
    // Longitud en Perú es negativa (~ -76.9)
    assert.ok(ring[0][0] < -70);
    // Latitud en Moyobamba es negativa (~ -6.0)
    assert.ok(ring[0][1] < 0 && ring[0][1] > -10);
  });

  test('exportLotsCsv genera formato CSV con BOM UTF-8 y columnas catastrales', () => {
    const csvStr = exportLotsCsv([dummyLot]);
    assert.ok(csvStr.startsWith('\uFEFF'), 'Debe incluir BOM UTF-8 para compatibilidad Excel');

    const lines = csvStr.split('\r\n');
    assert.ok(lines.length >= 2);
    assert.ok(lines[0].includes('ID_LOTE,MANZANA,NUMERO_LOTE,HANDLE_CAD,AREA_TERRENO_M2'));
    assert.ok(lines[1].includes('MZ-Z'));
    assert.ok(lines[1].includes('DA92'));
    assert.ok(lines[1].includes('199.92'));
  });

  test('exportReport produce informe de diagnóstico en Markdown y JSON', () => {
    const report = exportReport({
      lotCandidates: [dummyLot],
      cadInventory: { totalEntities: 7759 },
      georeferencingReport: { rmse: 0.045 },
      auditTrail: [{ lot: 'DA92', action: 'SNAP_CLOSURE' }]
    });

    assert.ok(report.markdown.includes('# Informe de Auditoría, Georreferenciación y Diagnóstico CAD/GIS'));
    assert.ok(report.markdown.includes('DA92'));
    assert.ok(report.markdown.includes('Helmert 2D'));

    const parsedJson = JSON.parse(report.json);
    assert.equal(parsedJson.lotValidation.totalCandidates, 1);
    assert.equal(parsedJson.inventorySummary.totalEntities, 7759);
  });
});

