/**
 * Definiciones geodésicas y de sistemas de referencia de coordenadas (CRS)
 */

export const WGS84_ELLIPSOID = {
  name: 'WGS 84',
  a: 6378137.0,              // Semieje mayor (metros)
  f: 1 / 298.257223563,      // Aplanamiento
  b: 6356752.314245,         // Semieje menor (metros)
  e2: 0.00669437999014,      // Primera excentricidad al cuadrado: e² = 2f - f²
  ePrime2: 0.00673949674228  // Segunda excentricidad al cuadrado: e'² = e² / (1 - e²)
};

export const CRS_DEFINITIONS = {
  'EPSG:32718': {
    code: 'EPSG:32718',
    name: 'WGS 84 / UTM zone 18S',
    type: 'projected',
    datum: 'WGS 84',
    projection: 'Transverse Mercator',
    zone: 18,
    hemisphere: 'S',
    centralMeridian: -75.0, // Grados
    falseEasting: 500000.0,  // Metros
    falseNorthing: 10000000.0, // Metros (Hemisferio Sur)
    scaleFactor: 0.9996,
    units: 'metre',
    bbox: {
      west: -78.0,
      east: -72.0,
      south: -80.0,
      north: 0.0
    },
    location: 'Perú (San Martín, Moyobamba, Lima, etc.)'
  },
  'EPSG:4326': {
    code: 'EPSG:4326',
    name: 'WGS 84 (Geodetic / Geographic)',
    type: 'geographic',
    datum: 'WGS 84',
    units: 'degree',
    axisOrder: 'lon,lat'
  }
};
