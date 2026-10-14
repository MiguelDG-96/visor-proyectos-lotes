import { TOLERANCES } from '../geometry/tolerance.js';
import { distance } from '../geometry/coordinates.js';
import { PolygonGeometry } from '../geometry/polygon.js';
import { detectSelfIntersections } from '../geometry/intersections.js';
import { Measurements } from '../geometry/measurements.js';
import { ISSUE_CODES } from './issue-codes.js';

/**
 * Validador integral de polígonos
 */
export class ValidatePolygon {
  /**
   * Ejecuta la batería de validación sobre un conjunto de vértices
   * @param {number[][]} rawVertices 
   * @param {Object} [options]
   * @param {boolean} [options.isFormallyClosed=false]
   * @param {number|null} [options.labeledArea=null]
   * @param {number} [options.closureTolerance=TOLERANCES.CLOSURE]
   * @returns {{
   *   status: 'valid' | 'needs-review' | 'invalid',
   *   closureType: 'formal-closed' | 'probable-geometric-closure' | 'open',
   *   gap: number,
   *   area: number,
   *   perimeter: number,
   *   issues: Array<{ code: string, severity: string, message: string }>
   * }}
   */
  static validate(rawVertices, options = {}) {
    const isFormallyClosed = Boolean(options.isFormallyClosed);
    const labeledArea = options.labeledArea ?? null;
    const closureTol = options.closureTolerance ?? TOLERANCES.CLOSURE;

    const issues = [];
    let status = 'valid';
    let closureType = 'open';
    let gap = 0;

    if (!rawVertices || rawVertices.length < 2) {
      return {
        status: 'invalid',
        closureType: 'open',
        gap: 0,
        area: 0,
        perimeter: 0,
        issues: [{
          ...ISSUE_CODES.INSUFFICIENT_VERTICES,
          message: 'Entidad con menos de 2 vértices.'
        }]
      };
    }

    const vertexCount = rawVertices.length;

    // 1. Número de vértices
    if (vertexCount < 3) {
      status = 'invalid';
      issues.push({
        ...ISSUE_CODES.INSUFFICIENT_VERTICES,
        message: `Polilínea con solo ${vertexCount} vértices; no puede formar polígono con área.`
      });
      return {
        status,
        closureType: 'open',
        gap: 0,
        area: 0,
        perimeter: distance(rawVertices[0], rawVertices[1]),
        issues
      };
    }

    // 2. Comprobar cierre
    if (isFormallyClosed) {
      closureType = 'formal-closed';
    } else {
      const first = rawVertices[0];
      const last = rawVertices[vertexCount - 1];
      gap = distance(first, last);

      if (gap <= closureTol) {
        closureType = 'probable-geometric-closure';
        issues.push({
          ...ISSUE_CODES.PROBABLE_GEOMETRIC_CLOSURE,
          message: `Extremos coinciden con brecha de ${(gap * 100).toFixed(2)} cm (dentro de tolerancia ${(closureTol * 100).toFixed(0)} cm).`
        });
      } else {
        closureType = 'open';
        status = 'needs-review';
        issues.push({
          ...ISSUE_CODES.OPEN_POLYLINE,
          message: `Polilínea abierta con brecha física de ${gap.toFixed(3)} m entre extremos.`
        });
      }
    }

    // 3. Vértices duplicados consecutivos
    const dupCheck = PolygonGeometry.findDuplicateVertices(rawVertices);
    if (dupCheck.hasDuplicates) {
      issues.push({
        ...ISSUE_CODES.DUPLICATE_CONSECUTIVE_VERTICES,
        message: `Se detectaron ${dupCheck.duplicateIndices.length} vértices duplicados consecutivos.`
      });
    }

    // 4. Autointersecciones
    const effectiveClosed = closureType === 'formal-closed' || closureType === 'probable-geometric-closure';
    const selfInterCheck = detectSelfIntersections(rawVertices, effectiveClosed);
    if (selfInterCheck.hasSelfIntersection) {
      status = 'invalid';
      issues.push({
        ...ISSUE_CODES.SELF_INTERSECTING,
        message: `Se detectaron ${selfInterCheck.intersections.length} autointersecciones entre segmentos.`
      });
    }

    // 5. Cálculo métrico
    const area = Measurements.calculateArea(rawVertices);
    const perimeter = Measurements.calculatePerimeter(rawVertices, effectiveClosed);

    if (area <= TOLERANCES.DEGENERATE_AREA) {
      status = 'invalid';
      issues.push({
        ...ISSUE_CODES.DEGENERATE_AREA,
        message: `Área calculada degenerada o casi nula (${area.toFixed(4)} u²).`
      });
    }

    // 6. Discrepancia con área rotulada (si existe)
    if (labeledArea !== null && status !== 'invalid') {
      const disc = Measurements.checkAreaDiscrepancy(area, labeledArea);
      if (disc.hasDiscrepancy) {
        issues.push({
          ...ISSUE_CODES.AREA_DISCREPANCY,
          message: `Área calculada (${area.toFixed(2)}) difiere en ${disc.difference.toFixed(2)} u² del área rotulada (${labeledArea.toFixed(2)}).`
        });
      }
    }

    return {
      status,
      closureType,
      gap,
      area,
      perimeter,
      issues
    };
  }
}

