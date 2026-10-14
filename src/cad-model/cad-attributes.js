/**
 * Gestión de atributos y metadatos extendidos vinculados a entidades CAD
 * Mantiene la información comercial separada de la geometría CAD de origen.
 */

export class CadAttributesStore {
  constructor() {
    this.store = new Map();
  }

  /**
   * Asocia atributos a un handle CAD o ID de lote
   * @param {string} id 
   * @param {Object} attributes 
   */
  setAttributes(id, attributes) {
    const existing = this.store.get(id) || {};
    this.store.set(id, {
      ...existing,
      ...attributes,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Obtiene los atributos asociados
   * @param {string} id 
   * @returns {Object|null}
   */
  getAttributes(id) {
    return this.store.get(id) || null;
  }

  /**
   * Exporta todo el diccionario de atributos
   * @returns {Record<string, Object>}
   */
  toJSON() {
    return Object.fromEntries(this.store.entries());
  }
}

