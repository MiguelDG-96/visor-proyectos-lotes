import { deepClone, deepFreeze } from './entity-preservation.js';
import { normalizeHandle } from '../utils/ids.js';

/**
 * Representa una entidad CAD conservando íntegramente sus datos fuente y metadatos
 */
export class CadEntity {
  /**
   * @param {Object} params
   * @param {string} params.file
   * @param {string} params.handle
   * @param {string} params.type
   * @param {string} params.layer
   * @param {number} [params.space=0] 0: model space, 1: paper space
   * @param {Object} params.rawSource Datos y geometría fuente originales
   * @param {Object} [params.metadata={}] Metadatos de clasificación
   * @param {string[]} [params.warnings=[]] Advertencias detectadas durante la lectura
   */
  constructor({
    file = 'unknown.dxf',
    handle,
    type,
    layer,
    space = 0,
    rawSource,
    metadata = {},
    warnings = []
  }) {
    this.file = file;
    this.handle = normalizeHandle(handle);
    this.type = (type || 'UNKNOWN').toUpperCase();
    this.layer = layer || '0';
    this.space = Number(space) === 1 ? 'paper' : 'model';
    
    // La geometría y propiedades fuente se congelan para asegurar inmutabilidad absoluta
    this.source = deepFreeze(deepClone(rawSource || {}));
    
    this.metadata = {
      category: metadata.category || 'unknown',
      confidence: metadata.confidence || 'low',
      rule: metadata.rule || 'Sin clasificar',
      ...metadata
    };
    
    this.warnings = [...warnings];
  }

  /**
   * Obtiene una copia segura de los vértices originales
   * @returns {number[][]}
   */
  getVertices() {
    if (Array.isArray(this.source.vertices)) {
      return deepClone(this.source.vertices);
    }
    return [];
  }

  /**
   * Indica si la entidad tiene bandera formal de cierre
   * @returns {boolean}
   */
  isClosed() {
    if (this.source.closedFlag !== undefined) {
      return Boolean(this.source.closedFlag);
    }
    if (this.source.flags !== undefined) {
      return (this.source.flags & 1) === 1;
    }
    if (this.source.shape !== undefined) {
      return Boolean(this.source.shape);
    }
    return false;
  }

  /**
   * Serializa la entidad conservando toda la estructura
   * @returns {Object}
   */
  toJSON() {
    return {
      file: this.file,
      handle: this.handle,
      type: this.type,
      layer: this.layer,
      space: this.space,
      source: this.source,
      metadata: this.metadata,
      warnings: this.warnings
    };
  }
}

