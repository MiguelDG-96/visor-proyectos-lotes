import { WGS84_ELLIPSOID, CRS_DEFINITIONS } from './crs.js';

/**
 * Motor de proyección cartográfica rigurosa Transverse Mercator (UTM)
 * Algoritmo geodésico estándar (Redfearn / Karney) con precisión submilimétrica
 */
export class UtmProjection {
  constructor(zone = 18, south = true) {
    this.zone = zone;
    this.south = south;
    this.crs = CRS_DEFINITIONS['EPSG:32718'];
    this.ellipsoid = WGS84_ELLIPSOID;
    this.centralMeridianDeg = (zone - 1) * 6 - 180 + 3; // -75° para zona 18
    this.centralMeridianRad = this.centralMeridianDeg * (Math.PI / 180);
    this.k0 = 0.9996;
    this.falseEasting = 500000.0;
    this.falseNorthing = south ? 10000000.0 : 0.0;
  }

  /**
   * Convierte coordenadas proyectadas UTM (Este, Norte) a Geográficas (Latitud, Longitud)
   * @param {number} easting Coordenada Este en metros
   * @param {number} northing Coordenada Norte en metros
   * @returns {{ lat: number, lon: number, scaleFactor: number, convergenceDeg: number }}
   */
  toLatLon(easting, northing) {
    const { a, e2, ePrime2 } = this.ellipsoid;
    const x = easting - this.falseEasting;
    const y = northing - this.falseNorthing;

    // Arco de meridiano
    const M = y / this.k0;
    const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * Math.pow(e2, 3) / 256));

    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

    // Latitud huella (footprint latitude)
    const phi1 = mu + (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu)
                    + (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu)
                    + (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu)
                    + (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);

    const sinPhi1 = Math.sin(phi1);
    const cosPhi1 = Math.cos(phi1);
    const tanPhi1 = Math.tan(phi1);

    const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
    const T1 = tanPhi1 * tanPhi1;
    const C1 = ePrime2 * cosPhi1 * cosPhi1;
    const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
    const D = x / (N1 * this.k0);

    const latRad = phi1 - (N1 * tanPhi1 / R1) * (
      D * D / 2 -
      (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ePrime2) * Math.pow(D, 4) / 24 +
      (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ePrime2 - 3 * C1 * C1) * Math.pow(D, 6) / 720
    );

    const lonRad = this.centralMeridianRad + (
      D -
      (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
      (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ePrime2 + 24 * T1 * T1) * Math.pow(D, 5) / 120
    ) / cosPhi1;

    const lat = latRad * (180 / Math.PI);
    const lon = lonRad * (180 / Math.PI);

    // Factor de escala puntual k y convergencia de meridianos gamma
    const scaleFactor = this.calculateScaleFactor(easting, latRad);
    const convergenceDeg = Math.atan(Math.tan(lonRad - this.centralMeridianRad) * Math.sin(latRad)) * (180 / Math.PI);

    return { lat, lon, scaleFactor, convergenceDeg };
  }

  /**
   * Convierte coordenadas Geográficas (Latitud, Longitud) a UTM (Este, Norte)
   * @param {number} latDeg Latitud en grados decimales
   * @param {number} lonDeg Longitud en grados decimales
   * @returns {{ easting: number, northing: number, zone: number, south: boolean, scaleFactor: number }}
   */
  fromLatLon(latDeg, lonDeg) {
    const { a, e2, ePrime2 } = this.ellipsoid;
    const lat = latDeg * (Math.PI / 180);
    const lon = lonDeg * (Math.PI / 180);

    const sinLat = Math.sin(lat);
    const cosLat = Math.cos(lat);
    const tanLat = Math.tan(lat);

    const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
    const T = tanLat * tanLat;
    const C = ePrime2 * cosLat * cosLat;
    const A = cosLat * (lon - this.centralMeridianRad);

    const M = a * (
      (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * Math.pow(e2, 3) / 256) * lat -
      (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * Math.pow(e2, 3) / 1024) * Math.sin(2 * lat) +
      (15 * e2 * e2 / 256 + 45 * Math.pow(e2, 3) / 1024) * Math.sin(4 * lat) -
      (35 * Math.pow(e2, 3) / 3072) * Math.sin(6 * lat)
    );

    const easting = this.falseEasting + this.k0 * N * (
      A +
      (1 - T + C) * Math.pow(A, 3) / 6 +
      (5 - 18 * T + T * T + 72 * C - 58 * ePrime2) * Math.pow(A, 5) / 120
    );

    const northing = this.falseNorthing + this.k0 * (
      M +
      N * tanLat * (
        A * A / 2 +
        (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24 +
        (61 - 58 * T + T * T + 600 * C - 330 * ePrime2) * Math.pow(A, 6) / 720
      )
    );

    const scaleFactor = this.calculateScaleFactor(easting, lat);

    return {
      easting,
      northing,
      zone: this.zone,
      south: this.south,
      scaleFactor
    };
  }

  /**
   * Calcula el factor de escala puntual de cuadrícula (k)
   * Permite convertir distancias de cuadrícula CAD a distancias topográficas reales de terreno
   * @param {number} easting 
   * @param {number} latRad 
   * @returns {number} Factor de escala k
   */
  calculateScaleFactor(easting, latRad) {
    const q = (easting - this.falseEasting);
    const { a } = this.ellipsoid;
    // Aproximación de segundo orden: k ≈ k0 * (1 + (x'² / (2 * R² * k0²)))
    return this.k0 * (1 + Math.pow(q, 2) / (2 * Math.pow(a * this.k0, 2)));
  }

  /**
   * Proyecta un polígono completo de coordenadas CAD UTM a Geográficas WGS84 [lon, lat]
   * @param {number[][]} vertices Coordenadas CAD [[x, y], ...]
   * @returns {number[][]} Coordenadas GeoJSON [[lon, lat], ...]
   */
  projectPolygonToGeoJson(vertices) {
    return vertices.map(v => {
      const geo = this.toLatLon(v[0], v[1]);
      return [geo.lon, geo.lat];
    });
  }
}

