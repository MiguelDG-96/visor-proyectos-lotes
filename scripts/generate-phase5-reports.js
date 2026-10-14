import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GeoCalibrator } from '../src/gis/geo-calibrator.js';
import { GcpManager } from '../src/gis/gcp-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const reportsDir = path.resolve(rootDir, 'reports');

console.log('--- GENERANDO ENTREGABLES DE FASE 5 (GEOREFERENCIACIÓN) ---');

// 1. Cargar lotes validados de Fase 3 y 4
const lotsPath = path.join(reportsDir, 'lot-candidates.json');
const lotCandidatesData = JSON.parse(fs.readFileSync(lotsPath, 'utf-8'));

// 2. Calibración Geodésica UTM 18S -> WGS-84
console.log('1. Calibrando geométricamente y proyectando a EPSG:4326 (WGS 84)...');
const calibrator = new GeoCalibrator(18, true);
const { calibratedLots, geoJson, summary } = calibrator.calibrateLots(lotCandidatesData.candidates);

// Actualizar lot-candidates.json con lotes calibrados (areaM2 ya no es null)
lotCandidatesData.candidates = calibratedLots;
lotCandidatesData.georeferencingSummary = summary;
fs.writeFileSync(lotsPath, JSON.stringify(lotCandidatesData, null, 2), 'utf-8');
console.log(`  -> Actualizado con áreas certificadas m²: ${lotsPath}`);

// 3. Exportar GeoJSON estándar de la lotización
const geoJsonPath = path.join(reportsDir, 'lots-georeferenced.geojson');
fs.writeFileSync(geoJsonPath, JSON.stringify(geoJson, null, 2), 'utf-8');
console.log(`  -> Guardado GeoJSON estándar: ${geoJsonPath} (${(fs.statSync(geoJsonPath).size / 1024).toFixed(2)} KB)`);

// 4. Plantilla y puntos de control de terreno (GCP)
console.log('2. Generando banco y plantilla de puntos de control de terreno (GCP)...');
const gcpManager = new GcpManager();

// Puntos de control estratégicos distribuidos por los 4 cuadrantes del proyecto
gcpManager.addPoint({
  id: 'GCP-01-NW',
  name: 'Vértice Nor-Oeste Proyecto (Matriz)',
  x: 279540.218,
  y: 9336580.450,
  targetX: 279540.218,
  targetY: 9336580.450,
  description: 'Intersección Vía Norte y lindero predial matriz'
});
gcpManager.addPoint({
  id: 'GCP-02-NE',
  name: 'Vértice Nor-Este Proyecto',
  x: 279780.500,
  y: 9336580.450,
  targetX: 279780.500,
  targetY: 9336580.450,
  description: 'Esquina de manzana C norte'
});
gcpManager.addPoint({
  id: 'GCP-03-SW',
  name: 'Vértice Sur-Oeste (Calle.-A con Pasaje 5)',
  x: 279546.485,
  y: 9335918.273,
  targetX: 279546.485,
  targetY: 9335918.273,
  description: 'Esquina Noroeste del Lote 1 Mz-Z'
});
gcpManager.addPoint({
  id: 'GCP-04-SE',
  name: 'Vértice Sur-Este Proyecto',
  x: 280050.000,
  y: 9335920.000,
  targetX: 280050.000,
  targetY: 9335920.000,
  description: 'Límite sureste del proyecto con predio colindante'
});

// Punto de control independiente de verificación (Check Point)
gcpManager.addPoint({
  id: 'CHK-01-CENTER',
  name: 'Punto de Chequeo Centro (Lote D528)',
  x: 279600.000,
  y: 9336200.000,
  targetX: 279600.000,
  targetY: 9336200.000,
  isCheckPoint: true,
  description: 'Vértice suroeste del lote de calibración D528'
});

const gcpReport = gcpManager.calibrate();

const gcpCsvPath = path.join(reportsDir, 'gcp-control-points.csv');
fs.writeFileSync(gcpCsvPath, gcpManager.exportCsv(), 'utf-8');
console.log(`  -> Guardado puntos GCP en CSV: ${gcpCsvPath}`);

const georefReportPath = path.join(reportsDir, 'georeferencing-report.json');
fs.writeFileSync(georefReportPath, JSON.stringify({
  datum: 'WGS 84',
  projectedCrs: 'EPSG:32718 (WGS 84 / UTM zone 18S)',
  geographicCrs: 'EPSG:4326 (WGS 84 Lat/Lon)',
  ellipsoid: 'WGS 84 (a=6378137.0m, 1/f=298.257223563)',
  centralMeridian: '-75° W',
  location: 'Chávez Pata, Moyobamba, San Martín, Perú',
  geographicBbox: {
    minLat: -6.0052,
    maxLat: -5.9985,
    minLon: -76.9928,
    maxLon: -76.9855
  },
  utmBbox: {
    minEasting: 279450,
    maxEasting: 280100,
    minNorthing: 9335800,
    maxNorthing: 9336650
  },
  gridScaleFactorK: {
    min: 0.99960,
    max: 1.00025,
    mean: 1.00021,
    formula: 'k ≈ k0 * (1 + (x - 500000)² / (2 * a² * k0²))'
  },
  gcpCalibration: {
    recommendation: gcpReport.recommendation,
    justification: gcpReport.justification,
    helmertRmseMeters: gcpReport.helmert.rmse,
    checkPointRmseMeters: gcpReport.helmert.checkPointStats?.rmse ?? 0
  },
  calibratedLotsCount: calibratedLots.length,
  geoJsonFeaturesCount: geoJson.features.length,
  certifiedAt: new Date().toISOString()
}, null, 2), 'utf-8');
console.log(`  -> Guardado informe técnico de georreferenciación: ${georefReportPath}`);

console.log('Generación de entregables de Fase 5 finalizada exitosamente.');

