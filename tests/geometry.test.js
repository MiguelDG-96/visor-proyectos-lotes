import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { distance, arePointsEqual, crossProduct } from '../src/geometry/coordinates.js';
import { Measurements } from '../src/geometry/measurements.js';
import { detectSelfIntersections } from '../src/geometry/intersections.js';
import { PolygonGeometry } from '../src/geometry/polygon.js';

describe('Geometry Utilities Test Suite', () => {
  test('Cálculo de distancia euclidiana y comparación de puntos con tolerancia', () => {
    assert.equal(distance([0, 0], [3, 4]), 5);
    assert.ok(arePointsEqual([10.0, 20.0], [10.0005, 20.0005], 0.001));
    assert.ok(!arePointsEqual([10.0, 20.0], [10.05, 20.0], 0.01));
  });

  test('Fórmula de Shoelace calcula área exacta para polígonos regulares e irregulares', () => {
    // Rectángulo de 8m x 25m = 200m²
    const rect = [[0, 0], [8, 0], [8, 25], [0, 25]];
    assert.equal(Measurements.calculateArea(rect), 200.0);
    assert.equal(Measurements.calculatePerimeter(rect, true), 66.0);

    // Triángulo base 10, altura 6 = 30m²
    const tri = [[0, 0], [10, 0], [5, 6]];
    assert.equal(Measurements.calculateArea(tri), 30.0);
  });

  test('Detección de autointersecciones (polígono cruzado / forma de 8)', () => {
    // Polígono con lazo cruzado en X
    const bowtie = [[0, 0], [10, 10], [0, 10], [10, 0]];
    const res = detectSelfIntersections(bowtie, true);
    assert.equal(res.hasSelfIntersection, true);
    assert.ok(res.intersections.length > 0);

    // Polígono convexo sin autointersecciones
    const cleanPoly = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const cleanRes = detectSelfIntersections(cleanPoly, true);
    assert.equal(cleanRes.hasSelfIntersection, false);
  });

  test('Cálculo de centroide geométrico por integración de momentos', () => {
    // Centroide de rectángulo [0, 10] x [0, 20] debe ser [5, 10]
    const rect = [[0, 0], [10, 0], [10, 20], [0, 20]];
    const c = PolygonGeometry.calculateCentroid(rect);
    assert.ok(Math.abs(c[0] - 5.0) < 1e-4);
    assert.ok(Math.abs(c[1] - 10.0) < 1e-4);
  });

  test('Eliminación auditable de vértices consecutivos repetidos', () => {
    const raw = [[0, 0], [0, 0], [10, 0], [10, 10], [10, 10], [0, 10]];
    const cleaned = PolygonGeometry.cleanConsecutiveDuplicates(raw);
    assert.equal(cleaned.length, 4);
    assert.deepEqual(cleaned, [[0, 0], [10, 0], [10, 10], [0, 10]]);
  });
});

