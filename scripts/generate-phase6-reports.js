import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportCadInventoryJson } from '../src/export/export-cad-inventory-json.js';
import { exportLotsJson } from '../src/export/export-lots-json.js';
import { exportGeoJson } from '../src/export/export-geojson.js';
import { exportLotsCsv } from '../src/export/export-csv.js';
import { exportReport } from '../src/export/export-report.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function main() {
  console.log('--- Generando Entregables de Exportación Fase 6 & 7 ---');

  const inventoryPath = path.join(rootDir, 'reports', 'cad-inventory.json');
  const lotsPath = path.join(rootDir, 'reports', 'lot-candidates.json');
  const geoRepPath = path.join(rootDir, 'reports', 'georeferencing-report.json');
  const auditPath = path.join(rootDir, 'reports', 'audit-trail.json');

  const cadInventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const lotsData = JSON.parse(fs.readFileSync(lotsPath, 'utf8'));
  const georefReport = JSON.parse(fs.readFileSync(geoRepPath, 'utf8'));
  const auditTrail = fs.existsSync(auditPath) ? JSON.parse(fs.readFileSync(auditPath, 'utf8')) : [];

  const candidates = lotsData.candidates;

  // 1. Exportar Padrón Catastral a CSV con BOM UTF-8
  const csvContent = exportLotsCsv(candidates);
  const csvPath = path.join(rootDir, 'reports', 'padron-catastral.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`✓ Padrón Catastral CSV generado: ${csvPath} (${(Buffer.byteLength(csvContent) / 1024).toFixed(2)} KB)`);

  // 2. Exportar GeoJSON RFC 7946 (EPSG:4326)
  const geoJsonContent = exportGeoJson(candidates, { onlyValid: false });
  const geoJsonPath = path.join(rootDir, 'reports', 'lots-georeferenced.geojson');
  fs.writeFileSync(geoJsonPath, geoJsonContent, 'utf8');
  console.log(`✓ GeoJSON RFC 7946 generado: ${geoJsonPath} (${(Buffer.byteLength(geoJsonContent) / 1024).toFixed(2)} KB)`);

  // 3. Exportar Informe de Auditoría y Diagnóstico
  const reportObj = exportReport({
    lotCandidates: candidates,
    cadInventory,
    georeferencingReport: georefReport,
    auditTrail
  });

  const reportMdPath = path.join(rootDir, 'reports', 'diagnostico-auditoria.md');
  fs.writeFileSync(reportMdPath, reportObj.markdown, 'utf8');

  const reportJsonPath = path.join(rootDir, 'reports', 'diagnostico-auditoria.json');
  fs.writeFileSync(reportJsonPath, reportObj.json, 'utf8');
  console.log(`✓ Informe Diagnóstico MD generado: ${reportMdPath}`);
  console.log(`✓ Informe Diagnóstico JSON generado: ${reportJsonPath}`);

  // 4. Exportar Lotes de Trabajo JSON Normalizado
  const lotsJsonContent = exportLotsJson(candidates);
  const lotsJsonPath = path.join(rootDir, 'reports', 'lotes-trabajo-normalizado.json');
  fs.writeFileSync(lotsJsonPath, lotsJsonContent, 'utf8');
  console.log(`✓ JSON de Lotes de Trabajo generado: ${lotsJsonPath}`);

  console.log('--- Proceso completado exitosamente ---');
}

main().catch(err => {
  console.error('Error generando reportes:', err);
  process.exit(1);
});

