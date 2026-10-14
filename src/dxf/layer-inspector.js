/**
 * Inspector detallado de capas para el modelo CAD
 */

export class LayerInspector {
  /**
   * @param {import('../cad-model/cad-document.js').CadDocument} doc 
   */
  constructor(doc) {
    this.doc = doc;
  }

  /**
   * Retorna una lista estructurada con métricas de cada capa
   */
  inspectLayers() {
    const list = [];
    for (const [name, layer] of this.doc.layers.entries()) {
      const entities = this.doc.getEntitiesByLayer(name);
      list.push({
        name,
        colorHex: layer.colorHex,
        colorNumber: layer.colorNumber,
        flags: layer.flags,
        frozen: layer.frozen,
        locked: layer.locked,
        visible: layer.visible,
        totalEntities: entities.length,
        entityTypeCounts: { ...layer.entityTypeCounts }
      });
    }

    return list.sort((a, b) => b.totalEntities - a.totalEntities);
  }
}

