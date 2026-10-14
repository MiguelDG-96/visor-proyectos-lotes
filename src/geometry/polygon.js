import { arePointsEqual, distance } from './coordinates.js';
import { TOLERANCES } from './tolerance.js';

/**
 * Módulo de operaciones y análisis sobre polígonos
 */
export class PolygonGeometry {
  /**
   * Detecta si hay vértices consecutivos duplicados o segmentos de longitud cero
   * @param {number[][]} vertices 
   * @param {number} tol 
   * @returns {{ hasDuplicates: boolean, duplicateIndices: number[] }}
   */
  static findDuplicateVertices(vertices, tol = TOLERANCES.DUPLICATE_VERTEX) {
    if (!vertices || vertices.length < 2) {
      return { hasDuplicates: false, duplicateIndices: [] };
    }

    const duplicateIndices = [];
    for (let i = 0; i < vertices.length - 1; i++) {
      if (arePointsEqual(vertices[i], vertices[i + 1], tol)) {
        duplicateIndices.push(i);
      }
    }

    return {
      hasDuplicates: duplicateIndices.length > 0,
      duplicateIndices
    };
  }

  /**
   * Retorna una versión normalizada eliminando vértices duplicados consecutivos
   * (sin mutar los vértices originales)
   * @param {number[][]} vertices 
   * @param {number} tol 
   * @returns {number[][]}
   */
  static cleanConsecutiveDuplicates(vertices, tol = TOLERANCES.DUPLICATE_VERTEX) {
    if (!vertices || vertices.length < 2) return [...vertices];

    const cleaned = [vertices[0]];
    for (let i = 1; i < vertices.length; i++) {
      if (!arePointsEqual(vertices[i], cleaned[cleaned.length - 1], tol)) {
        cleaned.push(vertices[i]);
      }
    }
    return cleaned;
  }

  /**
   * Calcula el centroide geométrico auténtico mediante integración de momentos de polígono
   * (No un simple promedio de vértices)
   * @param {number[][]} vertices 
   * @returns {number[]} [cx, cy]
   */
  static calculateCentroid(vertices) {
    if (!vertices || vertices.length < 3) {
      if (!vertices || vertices.length === 0) return [0, 0];
      let sx = 0, sy = 0;
      for (const p of vertices) { sx += p[0]; sy += p[1]; }
      return [sx / vertices.length, sy / vertices.length];
    }

    let areaSigned = 0;
    let cx = 0;
    let cy = 0;
    const n = vertices.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const cross = vertices[i][0] * vertices[j][1] - vertices[j][0] * vertices[i][1];
      areaSigned += cross;
      cx += (vertices[i][0] + vertices[j][0]) * cross;
      cy += (vertices[i][1] + vertices[j][1]) * cross;
    }

    areaSigned = areaSigned / 2.0;
    if (Math.abs(areaSigned) < 1e-9) {
      // Si el área es nula o degenerada, fallback a promedio aritmético
      let sx = 0, sy = 0;
      for (const p of vertices) { sx += p[0]; sy += p[1]; }
      return [sx / n, sy / n];
    }

    cx = cx / (6.0 * areaSigned);
    cy = cy / (6.0 * areaSigned);
    return [cx, cy];
  }

  /**
   * Determina si el polígono está en sentido horario (Clockwise)
   * @param {number[][]} vertices 
   * @returns {boolean}
   */
  static isClockwise(vertices) {
    let sum = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      sum += (vertices[j][0] - vertices[i][0]) * (vertices[j][1] + vertices[i][1]);
    }
    return sum > 0;
  }
}

