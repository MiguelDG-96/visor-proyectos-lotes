import { TOLERANCES } from './tolerance.js';

/**
 * Utilidades de operaciones con puntos y vectores 2D
 */

export function distanceSq(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return dx * dx + dy * dy;
}

export function distance(p1, p2) {
  return Math.sqrt(distanceSq(p1, p2));
}

export function arePointsEqual(p1, p2, tol = TOLERANCES.DUPLICATE_VERTEX) {
  return distance(p1, p2) <= tol;
}

export function crossProduct(v1, v2) {
  return v1[0] * v2[1] - v1[1] * v2[0];
}

export function dotProduct(v1, v2) {
  return v1[0] * v2[0] + v1[1] * v2[1];
}

