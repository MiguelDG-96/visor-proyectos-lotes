import { classifyLayer, LAYER_CATEGORIES } from '../config/layers.config.js';

/**
 * Clasificador semántico de entidades CAD
 * Asigna categorías interpretadas sin alterar ni descartar la geometría original
 */
export class EntityClassifier {
  /**
   * Clasifica una entidad individual
   * @param {import('../cad-model/cad-entity.js').CadEntity} entity 
   * @returns {{ category: string, confidence: string, rule: string }}
   */
  static classify(entity) {
    // 1. Reglas basadas en la capa
    const layerClassification = classifyLayer(entity.layer);

    // 2. Refinamiento por tipo de geometría
    if (entity.layer === 'LOTES') {
      const vertices = entity.getVertices();
      if (vertices.length < 3) {
        return {
          category: LAYER_CATEGORIES.AUXILIAR,
          confidence: 'high',
          rule: 'Entidad en capa LOTES con menos de 3 vértices (segmento lineal, needs-review)'
        };
      }
      return layerClassification;
    }

    if (entity.type === 'CIRCLE' && entity.layer === 'circulos') {
      return {
        category: LAYER_CATEGORIES.CIRCULOS,
        confidence: 'high',
        rule: 'Círculo delimitador de numeración de lote'
      };
    }

    if (entity.type === 'DIMENSION' || entity.layer === 'Cotas') {
      return {
        category: LAYER_CATEGORIES.COTAS,
        confidence: 'high',
        rule: 'Cota o anotación métrica'
      };
    }

    return layerClassification;
  }

  /**
   * Reclasifica y agrupa todas las entidades de un documento
   * @param {import('../cad-model/cad-document.js').CadDocument} doc 
   */
  static classifyDocument(doc) {
    const results = {
      [LAYER_CATEGORIES.LOTES]: [],
      [LAYER_CATEGORIES.CALLES]: [],
      [LAYER_CATEGORIES.MANZANAS]: [],
      [LAYER_CATEGORIES.PARQUES]: [],
      [LAYER_CATEGORIES.PERIMETRO]: [],
      [LAYER_CATEGORIES.COTAS]: [],
      [LAYER_CATEGORIES.TEXTOS]: [],
      [LAYER_CATEGORIES.CIRCULOS]: [],
      [LAYER_CATEGORIES.AUXILIAR]: [],
      [LAYER_CATEGORIES.DESCONOCIDO]: []
    };

    for (const ent of doc.entities) {
      const cl = this.classify(ent);
      ent.metadata.category = cl.category;
      ent.metadata.confidence = cl.confidence;
      ent.metadata.rule = cl.rule;

      if (!results[cl.category]) {
        results[cl.category] = [];
      }
      results[cl.category].push(ent);
    }

    return results;
  }
}

