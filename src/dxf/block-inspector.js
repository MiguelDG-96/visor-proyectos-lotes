/**
 * Inspector de definiciones de bloques (BLOCKS) y referencias a bloques (INSERT)
 */

export class BlockInspector {
  /**
   * @param {import('../cad-model/cad-document.js').CadDocument} doc 
   */
  constructor(doc) {
    this.doc = doc;
  }

  /**
   * Inspecciona las definiciones de bloques
   */
  inspectDefinitions() {
    const definitions = [];
    for (const [name, block] of this.doc.blocks.entries()) {
      definitions.push({
        name,
        handle: block.handle || null,
        entitiesCount: Array.isArray(block.entities) ? block.entities.length : 0,
        raw: block
      });
    }
    return definitions;
  }

  /**
   * Inspecciona las instancias de inserción de bloques (INSERT) en el plano
   */
  inspectInsertReferences() {
    const inserts = this.doc.entities.filter(e => e.type === 'INSERT');
    return inserts.map(ins => ({
      handle: ins.handle,
      layer: ins.layer,
      blockName: ins.source.name,
      position: ins.source.position ? [ins.source.position.x, ins.source.position.y] : null,
      rotation: ins.source.rotation || 0,
      scale: {
        x: ins.source.xScale || 1,
        y: ins.source.yScale || 1,
        z: ins.source.zScale || 1
      }
    }));
  }
}

