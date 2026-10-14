import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { UtmProjection } from '../src/gis/utm-projection.js';
import { Helmert2D } from '../src/gis/helmert-transform.js';
import { Affine2D } from '../src/gis/affine-transform.js';
import { GcpManager } from '../src/gis/gcp-manager.js';
import { WorldFile } from '../src/gis/world-file.js';
import { GeoCalibrator } from '../src/gis/geo-calibrator.js';

describe('UTM Projection & Geodetic Engine Tests (Fase 5)', () => {
  const utm = new UtmProjection(18, true);

  test('Convierte coordenadas UTM de Moyobamba a Geográficas WGS84 con precisión submilimétrica', () => {
    // Coordenada central del proyecto: Este = 279600, Norte = 9336200
    const geo = utm.toLatLon(279600, 9336200);

    // Debe caer en Moyobamba (Latitud ~ -6.0017°, Longitud ~ -76.9911°)
    assert.ok(Math.abs(geo.lat - (-6.001763)) < 0.0001);
    assert.ok(Math.abs(geo.lon - (-76.991128)) < 0.0001);

    // Verificación inversa (cierre de ciclo: UTM -> Geo -> UTM)
    const backToUtm = utm.fromLatLon(geo.lat, geo.lon);
    assert.ok(Math.abs(backToUtm.easting - 279600) < 0.01, 'Cierre en Este < 1 cm');
    assert.ok(Math.abs(backToUtm.northing - 9336200) < 0.01, 'Cierre en Norte < 1 cm');
  });

  test('Calcula factor de escala puntual k y convergencia de meridianos', () => {
    const geo = utm.toLatLon(279600, 9336200);

    // En UTM a 220 km del meridiano central, k ≈ 1.0002
    assert.ok(geo.scaleFactor > 0.999 && geo.scaleFactor < 1.002);
    // Convergencia negativa en hemisferio sur al oeste del meridiano central
    assert.ok(Math.abs(geo.convergenceDeg) < 3.0);
  });
});

describe('Helmert 2D Similarity Transformation Tests (Fase 5)', () => {
  test('Recupera con exactitud matemática traslación, escala y rotación conocidas', () => {
    const trueTx = 250.0;
    const trueTy = -150.0;
    const trueScale = 1.025;
    const trueRotRad = (15 * Math.PI) / 180; // 15 grados

    const cTrue = trueScale * Math.cos(trueRotRad);
    const dTrue = trueScale * Math.sin(trueRotRad);

    const pts = [
      { x: 100, y: 100 },
      { x: 300, y: 120 },
      { x: 280, y: 400 },
      { x: 110, y: 350 }
    ].map(p => ({
      ...p,
      targetX: cTrue * p.x - dTrue * p.y + trueTx,
      targetY: dTrue * p.x + cTrue * p.y + trueTy
    }));

    const helmert = Helmert2D.fit(pts);

    assert.ok(Math.abs(helmert.scale - trueScale) < 1e-6);
    assert.ok(Math.abs(helmert.rotationDeg - 15.0) < 1e-6);
    assert.ok(Math.abs(helmert.tx - trueTx) < 1e-6);
    assert.ok(Math.abs(helmert.ty - trueTy) < 1e-6);
    assert.ok(helmert.rmse < 1e-6, 'RMSE en puntos sin ruido debe ser ~0');
  });

  test('Valida precisión con Check Points independientes', () => {
    const calib = [
      { x: 0, y: 0, targetX: 10, targetY: 20 },
      { x: 100, y: 0, targetX: 110, targetY: 20 },
      { x: 100, y: 100, targetX: 110, targetY: 120 }
    ];
    const check = [
      { x: 50, y: 50, targetX: 60, targetY: 70 }
    ];

    const helmert = Helmert2D.fit(calib, check);
    assert.ok(helmert.checkPointStats, 'Debe incluir estadísticas de check points');
    assert.equal(helmert.checkPointStats.count, 1);
    assert.ok(helmert.checkPointStats.rmse < 1e-6);
  });
});

describe('Affine 2D & GCP Manager Tests (Fase 5)', () => {
  test('Ajuste Afín detecta y cuantifica cizallamiento y escalas diferenciales', () => {
    // Puntos con escala diferencial sx=1.05, sy=1.00 (deformación de aspecto)
    const pts = [
      { x: 0, y: 0, targetX: 0, targetY: 0 },
      { x: 100, y: 0, targetX: 105, targetY: 0 },
      { x: 0, y: 100, targetX: 0, targetY: 100 },
      { x: 100, y: 100, targetX: 105, targetY: 100 }
    ];

    const affine = Affine2D.fit(pts);
    assert.ok(Math.abs(affine.scaleX - 1.05) < 1e-4);
    assert.ok(Math.abs(affine.scaleY - 1.00) < 1e-4);
    assert.ok(affine.differentialScale > 0.04);
  });

  test('GcpManager compara Helmert vs Afín y emite recomendación técnica', () => {
    const manager = new GcpManager();
    manager.addPoint({ id: 'P1', x: 279500, y: 9335900, targetX: 279502, targetY: 9335901 });
    manager.addPoint({ id: 'P2', x: 280000, y: 9335900, targetX: 280001, targetY: 9335902 });
    manager.addPoint({ id: 'P3', x: 280000, y: 9336400, targetX: 280002, targetY: 9336401 });
    manager.addPoint({ id: 'P4', x: 279500, y: 9336400, targetX: 279499, targetY: 9336399 });

    const calib = manager.calibrate();
    assert.ok(calib.helmert, 'Debe calcular Helmert');
    assert.ok(calib.affine, 'Debe calcular Afín');
    assert.ok(calib.recommendation.includes('Helmert'), 'Debe recomendar Helmert para proteger ortogonalidad');
  });

  test('WorldFile lee y genera correctamente archivos .tfw / .jgw', () => {
    const tfwText = `0.0500000000\n0.0000000000\n0.0000000000\n-0.0500000000\n279500.000000\n9336500.000000\n`;
    const wf = WorldFile.parse(tfwText);

    assert.equal(wf.a, 0.05);
    assert.equal(wf.e, -0.05);
    assert.equal(wf.c, 279500);
    assert.equal(wf.f, 9336500);
    assert.equal(wf.getGsdCm(), 5.0, 'GSD debe ser 5 cm/píxel');

    // Prueba de reversibilidad píxel <-> mundo
    const world = wf.pixelToWorld(100, 200);
    const pixel = wf.worldToPixel(world.x, world.y);
    assert.ok(Math.abs(pixel.u - 100) < 1e-6);
    assert.ok(Math.abs(pixel.v - 200) < 1e-6);
  });

  test('GeoCalibrator certifica el área en m² y genera GeoJSON válido', () => {
    const dummyLot = {
      id: 'LOT_TEST_D528',
      source: {
        entityHandle: 'D528',
        vertices: [
          [279600, 9336200],
          [279608, 9336200],
          [279608, 9336225],
          [279600, 9336225]
        ]
      },
      validation: {
        status: 'valid',
        closureType: 'formal-closed',
        issues: []
      },
      measurements: {
        areaSourceUnitsSquared: 200.0,
        perimeterSourceUnits: 66.0,
        areaM2: null
      },
      attributes: {
        manzana: 'MZ-B',
        numeroLote: '10'
      }
    };

    const calibrator = new GeoCalibrator();
    const result = calibrator.calibrateLots([dummyLot]);

    const calLot = result.calibratedLots[0];
    assert.equal(calLot.georeferencing.status, 'certified');
    assert.ok(calLot.measurements.areaM2 > 199.5 && calLot.measurements.areaM2 < 200.5);
    assert.equal(result.geoJson.features.length, 1);
    assert.equal(result.geoJson.features[0].geometry.type, 'Polygon');
    // Coordenadas en [lon, lat]
    assert.ok(result.geoJson.features[0].geometry.coordinates[0][0][0] < -70);
  });
});

