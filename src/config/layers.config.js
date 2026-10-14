/**
 * Configuración de capas y reglas de clasificación semántica para el plano CAD
 */

export const DEFAULT_LOT_LAYERS = ['LOTES'];

export const LAYER_CATEGORIES = {
  LOTES: 'lotes',
  CALLES: 'calles',
  MANZANAS: 'manzanas',
  PARQUES: 'parques',
  PERIMETRO: 'perimetro',
  TEXTOS: 'textos',
  COTAS: 'cotas',
  CIRCULOS: 'circulos',
  AUXILIAR: 'auxiliar',
  DESCONOCIDO: 'unknown'
};

/**
 * Mapeo de nombres de capas a categorías semánticas del proyecto
 */
export const LAYER_MAPPING_RULES = [
  {
    layerPattern: /^LOTES$/i,
    category: LAYER_CATEGORIES.LOTES,
    confidence: 'high',
    rule: 'Capa objetivo principal de lotización residencial'
  },
  {
    layerPattern: /^00-DISEÑO LOTES JOSE$/i,
    category: LAYER_CATEGORIES.LOTES,
    confidence: 'medium',
    rule: 'Capa de diseño secundario/alternativo de lotes'
  },
  {
    layerPattern: /^(nombre de calles|CENTRO|corte vias|PDF_corte vias)$/i,
    category: LAYER_CATEGORIES.CALLES,
    confidence: 'high',
    rule: 'Componentes de infraestructura vial (ejes, secciones y rotulación)'
  },
  {
    layerPattern: /^(manzanas|MANZANAS-ORIGINALES|PDF_MANZANAS-ORIGINALES)$/i,
    category: LAYER_CATEGORIES.MANZANAS,
    confidence: 'high',
    rule: 'Contornos y bloques perimetrales de manzana'
  },
  {
    layerPattern: /^grass$/i,
    category: LAYER_CATEGORIES.PARQUES,
    confidence: 'high',
    rule: 'Zonas verdes y áreas de aporte paisajístico'
  },
  {
    layerPattern: /^(MATRIZ|PREDIO_RURAL_PRI)$/i,
    category: LAYER_CATEGORIES.PERIMETRO,
    confidence: 'high',
    rule: 'Linderos del predio matriz y predios rurales colindantes'
  },
  {
    layerPattern: /^(Cotas|COORD)$/i,
    category: LAYER_CATEGORIES.COTAS,
    confidence: 'high',
    rule: 'Dimensiones y cotas técnicas'
  },
  {
    layerPattern: /^circulos$/i,
    category: LAYER_CATEGORIES.CIRCULOS,
    confidence: 'high',
    rule: 'Círculos delimitadores de números de lote'
  },
  {
    layerPattern: /^(numero lote|textc|MANZANEO|UC_TEXT|VERTICES|PDF_Text|PLUMA - 04)$/i,
    category: LAYER_CATEGORIES.TEXTOS,
    confidence: 'high',
    rule: 'Rótulos y textos informativos del proyecto'
  },
  {
    layerPattern: /^(0|Defpoints|CC|PDF_CC|GRILLA|vivienda|DISTANCIA)$/i,
    category: LAYER_CATEGORIES.AUXILIAR,
    confidence: 'medium',
    rule: 'Geometría auxiliar, marcos o capas del sistema'
  }
];

/**
 * Clasifica una capa según las reglas configuradas
 * @param {string} layerName 
 * @returns {{ category: string, confidence: string, rule: string }}
 */
export function classifyLayer(layerName) {
  if (!layerName) {
    return {
      category: LAYER_CATEGORIES.DESCONOCIDO,
      confidence: 'low',
      rule: 'Capa no especificada'
    };
  }

  for (const mapping of LAYER_MAPPING_RULES) {
    if (mapping.layerPattern.test(layerName.trim())) {
      return {
        category: mapping.category,
        confidence: mapping.confidence,
        rule: mapping.rule
      };
    }
  }

  return {
    category: LAYER_CATEGORIES.DESCONOCIDO,
    confidence: 'low',
    rule: 'Sin coincidencia con reglas conocidas (needs-review)'
  };
}

