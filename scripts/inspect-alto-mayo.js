import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DxfParser from 'dxf-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dxfPath = path.resolve(rootDir, 'Alto_mayo_CERCO_MODIFICADO.dxf');

console.log('=== DIAGNÓSTICO INTEGRAL: ALTO MAYO CERCO MODIFICADO ===');

const parser = new DxfParser();
const dxfText = fs.readFileSync(dxfPath, 'utf-8');
const dxf = parser.parseSync(dxfText);

const entities = dxf.entities || [];
console.log(`Total de entidades CAD: ${entities.length}`);

// 1. Desglose por capas
const layers = {};
entities.forEach(e => {
  layers[e.layer] = (layers[e.layer] || 0) + 1;
});
console.log('\n--- CAPAS DETECTADAS ---');
Object.entries(layers).sort((a,b) => b[1] - a[1]).forEach(([name, count]) => {
  console.log(`- ${name.padEnd(25)}: ${count} entidades`);
});

// 2. Cerco Perimétrico (PERIMETRO)
const perimEnts = entities.filter(e => e.layer === 'PERIMETRO');
console.log('\n--- CERCO PERIMÉTRICO (PERIMETRO) ---');
perimEnts.forEach((e, i) => {
  const v = e.vertices || [];
  if (v.length >= 2) {
    const len = Math.hypot(v[1].x - v[0].x, v[1].y - v[0].y);
    console.log(`Tramo ${i + 1}: P1(${v[0].x.toFixed(2)}, ${v[0].y.toFixed(2)}) -> P2(${v[1].x.toFixed(2)}, ${v[1].y.toFixed(2)}) | Longitud: ${len.toFixed(2)} m`);
  }
});

// 3. Predios / Lotes (31_PREDIOS_TOTAL y LOTES)
const predios = entities.filter(e => e.layer === '31_PREDIOS_TOTAL');
console.log(`\n--- PREDIOS TOTALES (31_PREDIOS_TOTAL: ${predios.length}) ---`);
let closedPredios = 0;
const predioAreas = [];
predios.forEach(e => {
  const v = e.vertices || [];
  if (v.length >= 3) {
    let a = 0;
    for (let i = 0; i < v.length; i++) {
      const j = (i + 1) % v.length;
      a += v[i].x * v[j].y - v[j].x * v[i].y;
    }
    a = Math.abs(a) / 2;
    if (a > 1) {
      closedPredios++;
      predioAreas.push(a);
    }
  }
});
console.log(`Polígonos cerrados válidos: ${closedPredios}`);
if (predioAreas.length > 0) {
  const minA = Math.min(...predioAreas);
  const maxA = Math.max(...predioAreas);
  const avgA = predioAreas.reduce((sum, x) => sum + x, 0) / predioAreas.length;
  console.log(`Área mínima: ${minA.toFixed(2)} m² | Área máxima: ${maxA.toFixed(2)} m² | Área promedio: ${avgA.toFixed(2)} m²`);
}

// 4. Bounding Box general
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
entities.forEach(e => {
  (e.vertices || []).forEach(v => {
    if (v.x != null && !isNaN(v.x)) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
    }
    if (v.y != null && !isNaN(v.y)) {
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }
  });
});
console.log(`\n--- ENVOLVENTE ESPACIAL (BOUNDING BOX) ---`);
console.log(`X Mín: ${minX.toFixed(2)} | X Máx: ${maxX.toFixed(2)} | Ancho: ${(maxX - minX).toFixed(2)} m`);
console.log(`Y Mín: ${minY.toFixed(2)} | Y Máx: ${maxY.toFixed(2)} | Alto:  ${(maxY - minY).toFixed(2)} m`);
