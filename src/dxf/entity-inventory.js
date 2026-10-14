/**
 * Módulo para generar y exportar el inventario completo de entidades CAD
 */

export class EntityInventory {
  /**
   * @param {import('../cad-model/cad-document.js').CadDocument} cadDocument 
   */
  constructor(cadDocument) {
    this.doc = cadDocument;
  }

  /**
   * Genera un resumen completo del inventario por capa y por tipo
   */
  generateSummary() {
    const summary = this.doc.getSummary();
    const layerBreakdown = {};

    for (const [layerName, layer] of this.doc.layers.entries()) {
      layerBreakdown[layerName] = {
        colorHex: layer.colorHex,
        totalEntities: layer.entityCount,
        types: { ...layer.entityTypeCounts }
      };
    }

    const categoryBreakdown = {};
    for (const [category, entities] of this.doc.entitiesByCategory.entries()) {
      categoryBreakdown[category] = {
        count: entities.length,
        layers: [...new Set(entities.map(e => e.layer))],
        types: entities.reduce((acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        }, {})
      };
    }

    return {
      file: summary.file,
      totalEntities: summary.totalEntities,
      modelSpaceCount: summary.modelSpaceCount,
      paperSpaceCount: summary.paperSpaceCount,
      layerCount: summary.layerCount,
      blockCount: summary.blockCount,
      bbox: summary.bbox,
      units: summary.units,
      entityTypes: summary.entityTypes,
      layerBreakdown,
      categoryBreakdown
    };
  }

  /**
   * Exporta el inventario completo a estructura serializable
   */
  exportInventory() {
    return {
      metadata: this.generateSummary(),
      layers: Array.from(this.doc.layers.values()).map(l => l.toJSON()),
      entities: this.doc.entities.map(e => e.toJSON())
    };
  }
}

