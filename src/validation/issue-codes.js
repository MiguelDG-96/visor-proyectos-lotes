/**
 * Catálogo normalizado de códigos de diagnóstico geométrico
 */

export const ISSUE_CODES = {
  // Errores críticos (la geometría no puede formar un lote válido)
  INSUFFICIENT_VERTICES: {
    code: 'INSUFFICIENT_VERTICES',
    severity: 'error',
    description: 'Polilínea con menos de 3 vértices; no puede formar polígono con área.'
  },
  DEGENERATE_AREA: {
    code: 'DEGENERATE_AREA',
    severity: 'error',
    description: 'Área calculada nula o casi nula (polígono colapsado o línea plana).'
  },
  SELF_INTERSECTING: {
    code: 'SELF_INTERSECTING',
    severity: 'error',
    description: 'El polígono se autointersecta (contorno en forma de lazo o figura de 8).'
  },

  // Advertencias (requieren revisión o autorización humana)
  OPEN_POLYLINE: {
    code: 'OPEN_POLYLINE',
    severity: 'warning',
    description: 'Polilínea abierta cuyos extremos no coinciden dentro de la tolerancia.'
  },
  AREA_DISCREPANCY: {
    code: 'AREA_DISCREPANCY',
    severity: 'warning',
    description: 'Discrepancia apreciable entre el área calculada y el área rotulada en el plano.'
  },

  // Informativos / Mejoras auditables
  PROBABLE_GEOMETRIC_CLOSURE: {
    code: 'PROBABLE_GEOMETRIC_CLOSURE',
    severity: 'info',
    description: 'Extremos coinciden dentro de la tolerancia de cierre geométrico.'
  },
  DUPLICATE_CONSECUTIVE_VERTICES: {
    code: 'DUPLICATE_CONSECUTIVE_VERTICES',
    severity: 'info',
    description: 'Se detectaron vértices consecutivos repetidos o segmentos de longitud cero.'
  },
  MISSING_LOT_POLYGON: {
    code: 'MISSING_LOT_POLYGON',
    severity: 'warning',
    description: 'Existe rotulación y cotas de lote pero carece de polilínea en la capa CAD.'
  }
};

