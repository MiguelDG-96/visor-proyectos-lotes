/**
 * Definición centralizada de tolerancias geométricas
 */

export const TOLERANCES = {
  // Tolerancia para cierre geométrico automático (3 cm, adecuado para dibujo 1:1000)
  CLOSURE: 0.03,

  // Tolerancia para considerar dos vértices consecutivos duplicados (1 mm)
  DUPLICATE_VERTEX: 0.001,

  // Tolerancia para segmentos de longitud cero (1 mm)
  ZERO_LENGTH_SEGMENT: 0.001,

  // Tolerancia para áreas casi nulas o degeneradas (0.01 m²)
  DEGENERATE_AREA: 0.01,

  // Tolerancia para discrepancia entre área calculada y rotulada (0.5 m²)
  AREA_DISCREPANCY: 0.5
};

