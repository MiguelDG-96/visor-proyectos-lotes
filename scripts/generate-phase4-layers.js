import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DxfReader } from '../src/dxf/dxf-reader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dxfPath = path.resolve(rootDir, '03- LOTIZACION UNIFICADO.dxf');
const reportsDir = path.resolve(rootDir, 'reports');

console.log('--- GENERANDO CAPAS COMPLETAS PARA EL VISOR CAD (FASE 4) ---');
const reader = new DxfReader();
const doc = reader.read(fs.readFileSync(dxfPath), '03- LOTIZACION UNIFICADO.dxf');

// 1. Perímetro del proyecto (MATRIZ y PREDIO_RURAL_PRI)
console.log('Extrayendo perímetro del proyecto...');
const perimetroEntities = doc.entities.filter(
  e => e.layer === 'MATRIZ' || e.layer === 'PREDIO_RURAL_PRI'
);
const perimetro = perimetroEntities.map(e => ({
  layer: e.layer,
  handle: e.handle,
  closed: e.isClosed(),
  vertices: e.getVertices()
})).filter(p => p.vertices.length >= 2);

// 2. Vías y Calles (Líneas de borde de calzada y ejes centrales)
console.log('Extrayendo infraestructura vial...');
const viasEntities = doc.entities.filter(
  e => e.layer === 'corte vias' || e.layer === 'PDF_corte vias' || e.layer === 'CENTRO'
);
const vias = viasEntities.map(e => ({
  layer: e.layer,
  type: e.type,
  handle: e.handle,
  isCenterline: e.layer === 'CENTRO',
  vertices: e.getVertices()
})).filter(v => v.vertices.length >= 2);

// 3. Contornos de Manzanas (Polilíneas envolventes)
console.log('Extrayendo contornos de manzanas...');
const manzanaPolyEntities = doc.entities.filter(
  e => (e.layer === 'manzanas' || e.layer === 'PDF_MANZANAS-ORIGINALES') &&
       (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE')
);
const manzanaContornos = manzanaPolyEntities.map(e => ({
  layer: e.layer,
  handle: e.handle,
  closed: e.isClosed(),
  vertices: e.getVertices()
})).filter(m => m.vertices.length >= 2);

// 4. Círculos de número de lote
console.log('Extrayendo círculos de numeración...');
const circulosEntities = doc.entities.filter(
  e => e.layer === 'circulos' && e.type === 'CIRCLE'
);
const circulos = circulosEntities.map(e => ({
  handle: e.handle,
  center: [e.source.center.x, e.source.center.y],
  radius: e.source.radius
}));

// 5. Cotas de dimensiones y áreas
console.log('Extrayendo cotas de medidas...');
const cotasEntities = doc.entities.filter(
  e => e.layer === 'Cotas' && e.source.text
);
const cotas = cotasEntities.map(e => {
  const p = e.source.startPoint || e.source.position || { x: 0, y: 0 };
  return {
    handle: e.handle,
    text: String(e.source.text).trim(),
    x: p.x,
    y: p.y,
    rotation: e.source.rotation || 0,
    height: e.source.textHeight || 1.2
  };
});

const layerBundle = {
  file: doc.file,
  extractedAt: new Date().toISOString(),
  perimetro,
  vias,
  manzanaContornos,
  circulos,
  cotas
};

const layersPath = path.join(reportsDir, 'cad-layers.json');
fs.writeFileSync(layersPath, JSON.stringify(layerBundle), 'utf-8');
console.log(`Guardado: ${layersPath} (${(fs.statSync(layersPath).size / 1024).toFixed(2)} KB)`);
console.log('Extracción de capas CAD finalizada exitosamente.');

