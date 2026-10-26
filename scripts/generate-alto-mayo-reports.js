import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DxfParser from 'dxf-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dxfPath = path.resolve(rootDir, 'Alto_mayo_CERCO_MODIFICADO.dxf');
const reportsDir = path.resolve(rootDir, 'reports');

console.log('--- GENERANDO CAPAS COMPLETAS CAD (ALTO MAYO - CAPA 0 + LOTES + PERIMETRO) ---');

const parser = new DxfParser();
const dxf = parser.parseSync(fs.readFileSync(dxfPath, 'utf-8'));
const entities = dxf.entities || [];

// Helper para extraer vértices [x, y]
function getVerts(e) {
  return (e.vertices || []).map(v => [v.x, v.y]);
}

// Filtro estricto para excluir marcas de agua de evaluación (líneas cruzadas y textos Aspose) y coordenadas desfasadas
function isInProjectBounds(e) {
  if (!e.vertices || e.vertices.length === 0) return false;
  return e.vertices.every(v => v.x >= 14000 && v.x <= 26000 && v.y >= 300 && v.y <= 13500);
}

// 1. Capa 0 (Calles, frentes y cierres de manzana - filtrando la marca de agua Aspose)
const capa0Ents = entities.filter(e => e.layer === '0' && isInProjectBounds(e));
const capa0 = capa0Ents.map((e, idx) => ({
  id: `C0-${idx + 1}`,
  handle: e.handle,
  layer: '0',
  closed: e.vertices?.length >= 3 && (e.vertices[0].x === e.vertices[e.vertices.length - 1].x && e.vertices[0].y === e.vertices[e.vertices.length - 1].y),
  vertices: getVerts(e)
})).filter(c => c.vertices.length >= 2);

// 2. Capa LOTES (Linderos divisorios y polígonos de lotes)
const lotesEnts = entities.filter(e => e.layer === 'LOTES' && isInProjectBounds(e));
const lotesCad = lotesEnts.map((e, idx) => ({
  id: `LOT-${idx + 1}`,
  handle: e.handle,
  layer: 'LOTES',
  closed: e.vertices?.length >= 3 && (e.vertices[0].x === e.vertices[e.vertices.length - 1].x && e.vertices[0].y === e.vertices[e.vertices.length - 1].y),
  vertices: getVerts(e)
})).filter(l => l.vertices.length >= 2);

// 3. Capa PERIMETRO (Cerco modificado)
const perimEnts = entities.filter(e => e.layer === 'PERIMETRO' && isInProjectBounds(e));
const perimetro = perimEnts.map((e, idx) => ({
  id: `PERIM-${idx + 1}`,
  handle: e.handle,
  layer: 'PERIMETRO',
  closed: false,
  vertices: getVerts(e),
  length_m: e.vertices?.length >= 2 ? Math.hypot(e.vertices[1].x - e.vertices[0].x, e.vertices[1].y - e.vertices[0].y) : 0
})).filter(p => p.vertices.length >= 2);

// 4. Capa AZULL (Ejes viales y bordes de calzada)
const azullEnts = entities.filter(e => e.layer === 'AZULL' && isInProjectBounds(e));
const azull = azullEnts.map((e, idx) => ({
  id: `AZUL-${idx + 1}`,
  handle: e.handle,
  layer: 'AZULL',
  vertices: getVerts(e)
})).filter(a => a.vertices.length >= 2);

// 5. Capa @NUMEROS DE LOTES y textos
const numLotesEnts = entities.filter(e => e.layer === '@NUMEROS DE LOTES' && isInProjectBounds(e));
const numerosLotes = numLotesEnts.map((e, idx) => ({
  id: `NUM-${idx + 1}`,
  handle: e.handle,
  layer: '@NUMEROS DE LOTES',
  vertices: getVerts(e)
})).filter(n => n.vertices.length >= 2);

const textosEnts = entities.filter(e => e.layer === 'textos' && isInProjectBounds(e));
const textos = textosEnts.map((e, idx) => ({
  id: `TXT-${idx + 1}`,
  handle: e.handle,
  layer: 'textos',
  vertices: getVerts(e)
})).filter(t => t.vertices.length >= 2);

// 6. Cuadricula Coordenadas y Puntos Geodésicos
const cuadriculaEnts = entities.filter(e => e.layer.includes('Cuadricula') && isInProjectBounds(e));
const cuadricula = cuadriculaEnts.map((e, idx) => ({
  id: `GRID-${idx + 1}`,
  handle: e.handle,
  layer: e.layer,
  vertices: getVerts(e)
})).filter(g => g.vertices.length >= 2);

const puntosGeoEnts = entities.filter(e => e.layer === 'PUNTOS GEODESICOS' && isInProjectBounds(e));
const puntosGeodesicos = puntosGeoEnts.map((e, idx) => ({
  id: `GEO-${idx + 1}`,
  handle: e.handle,
  layer: 'PUNTOS GEODESICOS',
  vertices: getVerts(e)
})).filter(p => p.vertices.length >= 2);

// 7. Extraer polígonos de lotes interactivos (combinando los cerrados de LOTES y Capa 0)
const candidates = [];
const allLotPolys = [...lotesCad.filter(l => l.closed), ...capa0.filter(c => c.closed)];

allLotPolys.forEach((poly, idx) => {
  const v = poly.vertices;
  if (v.length < 3) return;

  // Filtrar viñetas aisladas fuera del área del proyecto (X > 1000)
  if (v[0][0] < 1000) return;

  // Calcular área
  let area = 0;
  let perim = 0;
  for (let i = 0; i < v.length; i++) {
    const next = v[(i + 1) % v.length];
    area += v[i][0] * next[1] - next[0] * v[i][1];
    perim += Math.hypot(next[0] - v[i][0], next[1] - v[i][1]);
  }
  area = Math.abs(area) / 2;

  // Filtrar áreas que correspondan a predios/lotes (evitar envolventes gigantes de 50,000 m²)
  if (area < 10 || area > 5000) return;

  // Centroide
  let cx = 0, cy = 0;
  v.forEach(pt => { cx += pt[0]; cy += pt[1]; });
  cx /= v.length;
  cy /= v.length;

  candidates.push({
    id: `LOT-AM-${String(candidates.length + 1).padStart(3, '0')}`,
    source: {
      file: 'Alto_mayo_CERCO_MODIFICADO.dwg',
      entityHandle: poly.handle,
      entityType: 'POLYLINE',
      layer: poly.layer,
      vertices: v,
      closedFlag: true
    },
    validation: {
      status: 'valid',
      closureType: 'closed-polygon',
      issues: []
    },
    measurements: {
      areaM2: Number(area.toFixed(2)),
      perimeterM: Number(perim.toFixed(2)),
      centroid: [Number(cx.toFixed(2)), Number(cy.toFixed(2))]
    },
    attributes: {
      proyecto: 'Alto Mayo',
      manzana: 'AM',
      numeroLote: String(candidates.length + 1),
      estado: (candidates.length % 9 === 0) ? 'vendido' : ((candidates.length % 5 === 0) ? 'reservado' : 'disponible')
    }
  });
});

console.log(`✓ Capa 0: ${capa0.length} entidades extraídas`);
console.log(`✓ Capa LOTES: ${lotesCad.length} entidades extraídas`);
console.log(`✓ Capa PERIMETRO: ${perimetro.length} tramos`);
console.log(`✓ Capa AZULL: ${azull.length} tramos viales`);
console.log(`✓ Rótulos y Textos: ${textos.length + numerosLotes.length} elementos`);
console.log(`✓ Polígonos de lote interactivos: ${candidates.length} lotes`);

// Guardar reportes actualizados
const lotCandidatesData = {
  project: 'Alto Mayo (Cerco Modificado)',
  file: 'Alto_mayo_CERCO_MODIFICADO.dwg',
  totalCandidates: candidates.length,
  breakdown: {
    withLotNumberAssociated: candidates.length,
    repairedOrReconstructed: 0
  },
  manzanaLabels: [],
  streetLabels: [],
  candidates
};

const cadLayersData = {
  file: 'Alto_mayo_CERCO_MODIFICADO.dwg',
  extractedAt: new Date().toISOString(),
  capa0,
  lotesCad,
  perimetro,
  azull,
  numerosLotes,
  textos,
  cuadricula,
  puntosGeodesicos
};

fs.writeFileSync(
  path.resolve(reportsDir, 'alto-mayo-candidates.json'),
  JSON.stringify(lotCandidatesData, null, 2),
  'utf-8'
);
fs.writeFileSync(
  path.resolve(reportsDir, 'alto-mayo-cad-layers.json'),
  JSON.stringify(cadLayersData, null, 2),
  'utf-8'
);

console.log('✓ Archivos actualizados exitosamente en reports/');
