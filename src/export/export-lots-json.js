/**
 * Exportador de Lotes de Trabajo a JSON
 * Preserva estrictamente source.vertices inmutables y documenta reparaciones y georreferenciación
 */
export function exportLotsJson(lotCandidates, metadata = {}) {
  if (!Array.isArray(lotCandidates)) {
    throw new Error('lotCandidates debe ser un arreglo de lotes.');
  }

  // Verificar integridad e inmutabilidad
  const cleanLots = lotCandidates.map(lot => {
    // Clon profundo para garantizar no mutación
    const exportedLot = {
      id: lot.id,
      source: {
        file: lot.source?.file || '03- LOTIZACION UNIFICADO.dxf',
        entityHandle: lot.source?.entityHandle,
        entityType: lot.source?.entityType || 'LWPOLYLINE',
        layer: lot.source?.layer || 'LOTES',
        closedFlag: lot.source?.closedFlag,
        vertices: (lot.source?.vertices || []).map(pt => [pt[0], pt[1]])
      },
      validation: {
        status: lot.validation?.status || 'valid',
        closureType: lot.validation?.closureType,
        issues: lot.validation?.issues || []
      },
      measurements: {
        areaSourceUnitsSquared: lot.measurements?.areaSourceUnitsSquared ?? null,
        perimeterSourceUnits: lot.measurements?.perimeterSourceUnits ?? null,
        areaM2: lot.measurements?.areaM2 ?? null,
        scaleFactorK: lot.measurements?.scaleFactorK ?? null
      },
      attributes: {
        manzana: lot.attributes?.manzana || null,
        numeroLote: lot.attributes?.numeroLote || null,
        manzanaColor: lot.attributes?.manzanaColor || null,
        reconstructed: !!lot.attributes?.reconstructed
      },
      correctedGeometry: lot.correctedGeometry ? {
        closureType: lot.correctedGeometry.closureType,
        isClosed: lot.correctedGeometry.isClosed,
        vertices: (lot.correctedGeometry.vertices || []).map(pt => [pt[0], pt[1]]),
        auditNote: lot.correctedGeometry.auditNote || null
      } : null,
      georeferencing: lot.georeferencing ? {
        status: lot.georeferencing.status,
        datum: lot.georeferencing.datum,
        sourceCrs: lot.georeferencing.sourceCrs,
        targetCrs: lot.georeferencing.targetCrs,
        convergenceDeg: lot.georeferencing.convergenceDeg,
        coordinatesGeoJson: lot.georeferencing.coordinatesGeoJson,
        centroidGeo: lot.georeferencing.centroidGeo
      } : {
        status: 'pending',
        targetCrs: null,
        coordinates: null
      }
    };

    return exportedLot;
  });

  const validLots = cleanLots.filter(l => l.validation.status === 'valid' || l.validation.status === 'repaired');
  const reviewLots = cleanLots.filter(l => l.validation.status === 'needs-review');
  const invalidLots = cleanLots.filter(l => l.validation.status === 'invalid');
  const supersededLots = cleanLots.filter(l => l.validation.status === 'superseded');

  const payload = {
    metadata: {
      exportedAt: new Date().toISOString(),
      project: 'Lotización Chávez Pata, Moyobamba, San Martín, Perú',
      totalCandidates: cleanLots.length,
      breakdown: {
        valid: validLots.length,
        needsReview: reviewLots.length,
        invalid: invalidLots.length,
        superseded: supersededLots.length,
        repairedOrReconstructed: cleanLots.filter(l => l.correctedGeometry || l.attributes.reconstructed).length
      },
      ...metadata
    },
    candidates: cleanLots
  };

  return JSON.stringify(payload, null, 2);
}

