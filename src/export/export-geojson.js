/**
 * Exportador de Lotes a GeoJSON RFC 7946
 * Coordenadas en WGS84 [Longitud, Latitud] con cierre topológico estricto
 */
export function exportGeoJson(lotCandidates, options = {}) {
  if (!Array.isArray(lotCandidates)) {
    throw new Error('lotCandidates debe ser un arreglo de lotes.');
  }

  const includeSuperseded = options.includeSuperseded ?? false;
  const onlyValid = options.onlyValid ?? false;

  const filteredLots = lotCandidates.filter(lot => {
    if (!includeSuperseded && lot.validation?.status === 'superseded') {
      return false;
    }
    if (onlyValid && (lot.validation?.status === 'invalid' || lot.validation?.status === 'needs-review')) {
      return false;
    }
    // Requiere coordenadas GeoJSON calculadas
    if (!lot.georeferencing?.coordinatesGeoJson || lot.georeferencing.coordinatesGeoJson.length < 3) {
      return false;
    }
    return true;
  });

  const features = filteredLots.map(lot => {
    let coords = lot.georeferencing.coordinatesGeoJson.map(pt => [pt[0], pt[1]]);

    // Garantizar cierre del anillo lineal según RFC 7946 (primer punto == último punto)
    if (coords.length >= 3) {
      const p0 = coords[0];
      const pN = coords[coords.length - 1];
      if (Math.abs(p0[0] - pN[0]) > 1e-9 || Math.abs(p0[1] - pN[1]) > 1e-9) {
        coords.push([p0[0], p0[1]]);
      }
    }

    return {
      type: 'Feature',
      id: lot.id,
      properties: {
        entityHandle: lot.source?.entityHandle || null,
        manzana: lot.attributes?.manzana || null,
        numeroLote: lot.attributes?.numeroLote || null,
        areaM2: lot.measurements?.areaM2 ?? null,
        gridAreaM2: lot.measurements?.areaSourceUnitsSquared ?? null,
        scaleFactorK: lot.measurements?.scaleFactorK ?? 1.00021,
        perimetroM: Number((lot.measurements?.perimeterSourceUnits || 0).toFixed(2)),
        validationStatus: lot.validation?.status || 'valid',
        closureType: lot.correctedGeometry?.closureType || lot.validation?.closureType || 'unknown',
        reconstructed: !!lot.attributes?.reconstructed,
        repaired: !!lot.correctedGeometry,
        targetCrs: lot.georeferencing?.targetCrs || 'EPSG:4326',
        sourceCrs: lot.georeferencing?.sourceCrs || 'EPSG:32718'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      }
    };
  });

  const featureCollection = {
    type: 'FeatureCollection',
    name: options.name || 'Lotizacion_Chavez_Pata_Moyobamba',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
    },
    features
  };

  return JSON.stringify(featureCollection, null, 2);
}

