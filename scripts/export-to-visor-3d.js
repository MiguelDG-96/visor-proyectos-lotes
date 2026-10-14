import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const target3dDir = 'D:/programas/proyecto/visor-inmobiliario-3d';

async function exportToVisor3d() {
  console.log('--- EXPORTANDO DATOS DE CHÁVEZ PATA AL VISOR 3D ---');

  const lotsPath = path.join(rootDir, 'reports', 'lot-candidates.json');
  const layersPath = path.join(rootDir, 'reports', 'cad-layers.json');

  const lotsData = JSON.parse(fs.readFileSync(lotsPath, 'utf8'));
  const layersData = JSON.parse(fs.readFileSync(layersPath, 'utf8'));

  // 1. Origen local para Three.js (Centro del proyecto)
  const X0 = 279700.0;
  const Y0 = 9336250.0;

  // 2. Procesar lotes válidos
  const validCandidates = lotsData.candidates.filter(l => l.validation.status !== 'superseded');

  let totalArea = 0;
  let countDisp = 0, countRes = 0, countVend = 0;

  const processedLots = validCandidates.map((lot, index) => {
    const rawVerts = (lot.correctedGeometry?.vertices) || lot.source.vertices;
    
    // Convertir a coordenadas locales Three.js (X = Este-Oeste, Z = Norte-Sur invertido)
    const verticesLocal = rawVerts.map(pt => [
      Number((pt[0] - X0).toFixed(3)),
      Number((-(pt[1] - Y0)).toFixed(3))
    ]);

    // Calcular centroide local
    let sumX = 0, sumZ = 0;
    verticesLocal.forEach(p => { sumX += p[0]; sumZ += p[1]; });
    const cx = Number((sumX / verticesLocal.length).toFixed(3));
    const cz = Number((sumZ / verticesLocal.length).toFixed(3));

    // Vértices relativos al centroide del lote (para centrar geometrías Three.js)
    const verticesRel = verticesLocal.map(p => [
      Number((p[0] - cx).toFixed(3)),
      Number((p[1] - cz).toFixed(3))
    ]);

    // Calcular dimensiones aproximadas de frente y fondo
    let minLx = Infinity, maxLx = -Infinity, minLz = Infinity, maxLz = -Infinity;
    verticesLocal.forEach(p => {
      if (p[0] < minLx) minLx = p[0];
      if (p[0] > maxLx) maxLx = p[0];
      if (p[1] < minLz) minLz = p[1];
      if (p[1] > maxLz) maxLz = p[1];
    });
    const spanX = maxLx - minLx;
    const spanZ = maxLz - minLz;
    const frente_m = Number((Math.min(spanX, spanZ)).toFixed(2));
    const fondo_m = Number((Math.max(spanX, spanZ)).toFixed(2));

    const areaM2 = lot.measurements?.areaM2 || (lot.measurements?.areaSourceUnitsSquared ? Number((lot.measurements.areaSourceUnitsSquared / 1.00042).toFixed(2)) : 160.0);
    totalArea += areaM2;

    // Normalizar Manzana
    let mzNorm = (lot.attributes?.manzana || 'MZ-GENERAL').replace(/\s+/g, '').toUpperCase();
    if (mzNorm.startsWith('MZ-')) mzNorm = mzNorm;
    else if (mzNorm.startsWith('MZ')) mzNorm = 'MZ-' + mzNorm.substring(2);

    const numLote = lot.attributes?.numeroLote || String(index + 1);

    // Estado comercial semi-aleatorio determinista
    const pseudoRand = (index * 17 + 31) % 100;
    let estado = 'disponible';
    if (pseudoRand < 12) {
      estado = 'vendido'; // ~12% vendidos con casita de muestra
      countVend++;
    } else if (pseudoRand < 32) {
      estado = 'reservado'; // ~20% reservados
      countRes++;
    } else {
      estado = 'disponible'; // ~68% disponibles
      countDisp++;
    }

    const precioM2 = 320; // S/ 320 por m² promedio en zona residencial
    const precioSoles = Math.round(areaM2 * precioM2);

    return {
      id: index + 1,
      handle: lot.source.entityHandle,
      codigo: `${mzNorm}-L-${numLote.padStart(2, '0')}`,
      manzana: mzNorm,
      numero: numLote,
      area_m2: Number(areaM2.toFixed(2)),
      perimetro_m: Number((lot.measurements?.perimeterSourceUnits || 0).toFixed(2)),
      frente_m: Math.max(frente_m, 6.0),
      fondo_m: Math.max(fondo_m, 15.0),
      precio_soles: precioSoles,
      precio_m2: precioM2,
      moneda: 'PEN',
      estado,
      es_esquina: verticesLocal.length > 4,
      es_reparado: !!lot.correctedGeometry,
      centroideLocal: [cx, cz],
      verticesLocal,
      verticesRel,
      coords_utm: {
        x: Number((cx + X0).toFixed(2)),
        y: Number((-cz + Y0).toFixed(2))
      },
      coords_gps: {
        lat: lot.georeferencing?.centroidGeo?.lat || -6.002,
        lon: lot.georeferencing?.centroidGeo?.lon || -76.991
      },
      vias_colindantes: ['Vía Principal', 'Pasaje Peatonal']
    };
  });

  // 3. Agrupar lotes por Manzana
  const manzanasMap = new Map();
  processedLots.forEach(lot => {
    if (!manzanasMap.has(lot.manzana)) {
      manzanasMap.set(lot.manzana, []);
    }
    manzanasMap.get(lot.manzana).push(lot);
  });

  const manzanasArray = Array.from(manzanasMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mzId, lotesList]) => ({
      id: mzId,
      nombre: `Manzana ${mzId.replace('MZ-', '')}`,
      total_lotes: lotesList.length,
      lotes: lotesList
    }));

  // 4. Procesar infraestructura vectorial (Vías, Perímetro y Manzanas)
  const vias3D = (layersData.vias || []).map(v => ({
    isCenterline: !!v.isCenterline,
    points: v.vertices.map(pt => [
      Number((pt[0] - X0).toFixed(2)),
      Number((-(pt[1] - Y0)).toFixed(2))
    ])
  }));

  const perimetro3D = (layersData.perimetro || []).map(p => ({
    closed: !!p.closed,
    points: p.vertices.map(pt => [
      Number((pt[0] - X0).toFixed(2)),
      Number((-(pt[1] - Y0)).toFixed(2))
    ])
  }));

  const manzanaContornos3D = (layersData.manzanaContornos || []).map(m => ({
    closed: !!m.closed,
    points: m.vertices.map(pt => [
      Number((pt[0] - X0).toFixed(2)),
      Number((-(pt[1] - Y0)).toFixed(2))
    ])
  }));

  // 5. Payload final compatible con visor-inmobiliario-3d
  const payload3D = {
    proyecto: {
      nombre: "Lotización Chávez Pata",
      nombre_comercial: "Lotización Chávez Pata — Moyobamba",
      tipo: "Habilitación Urbana — Lotización Residencial",
      empresa: "Tech & Science Inmobiliaria",
      ubicacion: "Chávez Pata, Moyobamba, Departamento de San Martín, Perú",
      moneda: "PEN",
      version_datos: "2.0.0-CAD-GEO",
      fecha_actualizacion: new Date().toISOString().split('T')[0],
      coordenadas_referencia: {
        sistema: "WGS 84 / UTM Zona 18 Sur (EPSG:32718)",
        datum: "WGS 84",
        origen_local_utm: { easting: X0, northing: Y0 },
        latitud_centro: -6.001763,
        longitud_centro: -76.991128,
        factor_escala_k: 1.000210,
        convergencia_meridianos_deg: -0.273
      },
      estadisticas: {
        total_lotes: processedLots.length,
        disponibles: countDisp,
        reservados: countRes,
        vendidos: countVend,
        area_total_lotes_m2: Number(totalArea.toFixed(2)),
        total_manzanas: manzanasArray.length
      }
    },
    estados_config: {
      disponible: {
        color: "#22c55e",
        color_hover: "#16a34a",
        label: "Disponible"
      },
      reservado: {
        color: "#f59e0b",
        color_hover: "#d97706",
        label: "Reservado"
      },
      vendido: {
        color: "#ef4444",
        color_hover: "#dc2626",
        label: "Vendido"
      }
    },
    manzanas: manzanasArray,
    infraestructura: {
      vias: vias3D,
      perimetro: perimetro3D,
      manzanaContornos: manzanaContornos3D
    }
  };

  // 6. Guardar en destino D:\programas\proyecto\visor-inmobiliario-3d\data\lotes.json
  const targetJsonPath = path.join(target3dDir, 'data', 'lotes.json');
  fs.writeFileSync(targetJsonPath, JSON.stringify(payload3D, null, 2), 'utf8');
  console.log(`✓ Archivo lotes.json actualizado en: ${targetJsonPath}`);
  console.log(`  -> Total lotes exportados: ${processedLots.length}`);
  console.log(`  -> Total manzanas: ${manzanasArray.length}`);
  console.log(`  -> Disponibles: ${countDisp} | Reservados: ${countRes} | Vendidos: ${countVend}`);
  console.log(`  -> Infraestructura: ${vias3D.length} vías, ${perimetro3D.length} perímetros, ${manzanaContornos3D.length} contornos`);

  // También guardar una copia en visor-inmobiliario-chatgpt/reports/lotes-3d-chavez-pata.json
  const localCopyPath = path.join(rootDir, 'reports', 'lotes-3d-chavez-pata.json');
  fs.writeFileSync(localCopyPath, JSON.stringify(payload3D, null, 2), 'utf8');
  console.log(`✓ Copia de respaldo guardada en: ${localCopyPath}`);
}

exportToVisor3d().catch(err => {
  console.error('Error al exportar a 3D:', err);
  process.exit(1);
});
