/**
 * Exportador de Padrón Catastral a CSV (Compatible con Excel / QGIS)
 * Incluye BOM UTF-8 y campos de manzana, lote, áreas, perímetros y coordenadas duales (UTM / WGS-84)
 */
export function exportLotsCsv(lotCandidates, options = {}) {
  if (!Array.isArray(lotCandidates)) {
    throw new Error('lotCandidates debe ser un arreglo de lotes.');
  }

  const includeSuperseded = options.includeSuperseded ?? false;

  const headers = [
    'ID_LOTE',
    'MANZANA',
    'NUMERO_LOTE',
    'HANDLE_CAD',
    'AREA_TERRENO_M2',
    'AREA_CAD_GRID_M2',
    'FACTOR_ESCALA_K',
    'PERIMETRO_M',
    'CENTROIDE_UTM_ESTE',
    'CENTROIDE_UTM_NORTE',
    'LATITUD_WGS84',
    'LONGITUD_WGS84',
    'ESTADO_VALIDACION',
    'TIPO_CIERRE',
    'REPARACION_AUDITABLE'
  ];

  const rows = [];

  for (const lot of lotCandidates) {
    if (!includeSuperseded && lot.validation?.status === 'superseded') {
      continue;
    }

    // Calcular centroide en UTM
    const verts = (lot.correctedGeometry?.vertices) || lot.source?.vertices || [];
    let sumX = 0, sumY = 0;
    if (verts.length > 0) {
      for (const p of verts) {
        sumX += p[0];
        sumY += p[1];
      }
      sumX /= verts.length;
      sumY /= verts.length;
    }

    const areaM2 = lot.measurements?.areaM2 ?? (lot.measurements?.areaSourceUnitsSquared ? Number((lot.measurements.areaSourceUnitsSquared / (1.00021 * 1.00021)).toFixed(2)) : '');
    const gridArea = lot.measurements?.areaSourceUnitsSquared ? Number(lot.measurements.areaSourceUnitsSquared.toFixed(2)) : '';
    const k = lot.measurements?.scaleFactorK ?? '1.000210';
    const perim = lot.measurements?.perimeterSourceUnits ? Number(lot.measurements.perimeterSourceUnits.toFixed(2)) : '';

    const lat = lot.georeferencing?.centroidGeo?.lat ?? '';
    const lon = lot.georeferencing?.centroidGeo?.lon ?? '';

    let repairDesc = 'Original Directo';
    if (lot.attributes?.reconstructed) {
      repairDesc = 'Reconstrucción Asistida Residual';
    } else if (lot.correctedGeometry) {
      repairDesc = `Reparación Auditable (${lot.correctedGeometry.closureType || 'Snap'})`;
    }

    rows.push([
      escapeCsv(lot.id),
      escapeCsv(lot.attributes?.manzana || 'Sin Manzana'),
      escapeCsv(lot.attributes?.numeroLote || '-'),
      escapeCsv(lot.source?.entityHandle || ''),
      escapeCsv(areaM2),
      escapeCsv(gridArea),
      escapeCsv(k),
      escapeCsv(perim),
      escapeCsv(sumX ? sumX.toFixed(3) : ''),
      escapeCsv(sumY ? sumY.toFixed(3) : ''),
      escapeCsv(lat),
      escapeCsv(lon),
      escapeCsv(lot.validation?.status || 'valid'),
      escapeCsv(lot.correctedGeometry?.closureType || lot.validation?.closureType || 'formal-closed'),
      escapeCsv(repairDesc)
    ]);
  }

  // BOM UTF-8 para garantizar que Microsoft Excel abra las tildes y símbolos correctamente
  const bom = '\uFEFF';
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  return bom + csvContent;
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

