import { distance } from './coordinates.js';
import { TOLERANCES } from './tolerance.js';

/**
 * Cálculos métricos precisos y comparación de discrepancias
 */
export class Measurements {
  /**
   * Calcula el área mediante la fórmula de Shoelace (cordón de zapatos)
   * @param {number[][]} vertices 
   * @returns {number} Área positiva
   */
  static calculateArea(vertices) {
    if (!vertices || vertices.length < 3) return 0.0;
    let area = 0.0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i][0] * vertices[j][1];
      area -= vertices[j][0] * vertices[i][1];
    }
    return Math.abs(area) / 2.0;
  }

  /**
   * Calcula el perímetro del polígono
   * @param {number[][]} vertices 
   * @param {boolean} isClosed 
   * @returns {number}
   */
  static calculatePerimeter(vertices, isClosed = true) {
    if (!vertices || vertices.length < 2) return 0.0;
    let perimeter = 0.0;
    const n = vertices.length;
    for (let i = 0; i < n - 1; i++) {
      perimeter += distance(vertices[i], vertices[i + 1]);
    }
    if (isClosed && n >= 3) {
      perimeter += distance(vertices[n - 1], vertices[0]);
    }
    return perimeter;
  }

  /**
   * Compara el área calculada con el área rotulada encontrada en los textos
   * @param {number} calculatedArea 
   * @param {number|null} labeledArea 
   * @param {number} tol 
   * @returns {{ hasDiscrepancy: boolean, difference: number }}
   */
  static checkAreaDiscrepancy(calculatedArea, labeledArea, tol = TOLERANCES.AREA_DISCREPANCY) {
    if (labeledArea === null || labeledArea === undefined || Number.isNaN(labeledArea)) {
      return { hasDiscrepancy: false, difference: 0 };
    }
    const diff = Math.abs(calculatedArea - labeledArea);
    return {
      hasDiscrepancy: diff > tol,
      difference: diff
    };
  }
}

