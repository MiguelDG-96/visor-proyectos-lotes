import { arePointsEqual } from './coordinates.js';
import { TOLERANCES } from './tolerance.js';

/**
 * Determina la orientación de la terna ordenada (p, q, r)
 * 0: colineales, 1: sentido horario, 2: sentido antihorario
 */
function orientation(p, q, r) {
  const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : 2;
}

/**
 * Comprueba si el punto q se encuentra en el segmento pr
 */
function onSegment(p, q, r) {
  return (
    q[0] <= Math.max(p[0], r[0]) + 1e-9 &&
    q[0] >= Math.min(p[0], r[0]) - 1e-9 &&
    q[1] <= Math.max(p[1], r[1]) + 1e-9 &&
    q[1] >= Math.min(p[1], r[1]) - 1e-9
  );
}

/**
 * Comprueba si los segmentos p1q1 y p2q2 se intersectan estrictamente
 * (excluyendo extremos compartidos)
 * @param {number[]} p1 
 * @param {number[]} q1 
 * @param {number[]} p2 
 * @param {number[]} q2 
 * @returns {boolean}
 */
export function doSegmentsIntersect(p1, q1, p2, q2) {
  // Si comparten un extremo, no cuenta como autointersección de polígono
  if (
    arePointsEqual(p1, p2) ||
    arePointsEqual(p1, q2) ||
    arePointsEqual(q1, p2) ||
    arePointsEqual(q1, q2)
  ) {
    return false;
  }

  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  // Caso general de intersección
  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  // Casos especiales de colinealidad
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

/**
 * Detecta si un polígono tiene autointersecciones
 * @param {number[][]} vertices 
 * @param {boolean} isClosed 
 * @returns {{ hasSelfIntersection: boolean, intersections: Array<{ segment1: number[], segment2: number[] }> }}
 */
export function detectSelfIntersections(vertices, isClosed = true) {
  if (!vertices || vertices.length < 4) {
    return { hasSelfIntersection: false, intersections: [] };
  }

  const n = vertices.length;
  const segments = [];
  for (let i = 0; i < n - 1; i++) {
    segments.push({ idx: i, p1: vertices[i], p2: vertices[i + 1] });
  }
  if (isClosed && !arePointsEqual(vertices[0], vertices[n - 1])) {
    segments.push({ idx: n - 1, p1: vertices[n - 1], p2: vertices[0] });
  }

  const intersections = [];
  const segCount = segments.length;

  for (let i = 0; i < segCount; i++) {
    for (let j = i + 1; j < segCount; j++) {
      // Omitir segmentos adyacentes que comparten vértice de forma natural
      if (Math.abs(segments[i].idx - segments[j].idx) <= 1) continue;
      if (segments[i].idx === 0 && segments[j].idx === segCount - 1) continue;

      if (doSegmentsIntersect(segments[i].p1, segments[i].p2, segments[j].p1, segments[j].p2)) {
        intersections.push({
          segment1: [segments[i].idx, (segments[i].idx + 1) % n],
          segment2: [segments[j].idx, (segments[j].idx + 1) % n]
        });
      }
    }
  }

  return {
    hasSelfIntersection: intersections.length > 0,
    intersections
  };
}

