import { CadLayer } from './cad-layer.js';
import { CadEntity } from './cad-entity.js';
import { deepFreeze } from './entity-preservation.js';

/**
 * Contenedor del documento CAD completo
 * Preserva el 100% de las entidades, capas, bloques y metadatos sin mutaciones
 */
export class CadDocument {
  constructor({
    file = 'unknown.dxf',
    header = {},
    layers = new Map(),
    blocks = new Map()
  } = {}) {
    this.file = file;
    this.header = deepFreeze({ ...header });
    this.layers = layers; // Map<string, CadLayer>
    this.blocks = blocks; // Map<string, Object>
    
    this.entities = []; // CadEntity[]
    this.entitiesByHandle = new Map(); // Map<string, CadEntity>
    this.entitiesByLayer = new Map(); // Map<string, CadEntity[]>
    this.entitiesByCategory = new Map(); // Map<string, CadEntity[]>
    
    this.bbox = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity
    };
  }

  /**
   * Añade una entidad al documento y actualiza los índices y estadísticas
   * @param {CadEntity} entity 
   */
  addEntity(entity) {
    this.entities.push(entity);
    
    if (entity.handle) {
      this.entitiesByHandle.set(entity.handle, entity);
    }

    // Índice por capa
    if (!this.entitiesByLayer.has(entity.layer)) {
      this.entitiesByLayer.set(entity.layer, []);
    }
    this.entitiesByLayer.get(entity.layer).push(entity);

    // Actualizar capa en la tabla de capas si existe
    if (this.layers.has(entity.layer)) {
      this.layers.get(entity.layer).addEntity(entity.type);
    } else {
      const newLayer = new CadLayer({ name: entity.layer });
      newLayer.addEntity(entity.type);
      this.layers.set(entity.layer, newLayer);
    }

    // Índice por categoría semántica
    const category = entity.metadata?.category || 'unknown';
    if (!this.entitiesByCategory.has(category)) {
      this.entitiesByCategory.set(category, []);
    }
    this.entitiesByCategory.get(category).push(entity);

    // Actualizar Bounding Box para espacio modelo
    if (entity.space === 'model') {
      const pts = entity.getVertices();
      for (const pt of pts) {
        if (Array.isArray(pt) && pt.length >= 2) {
          const x = pt[0];
          const y = pt[1];
          if (x < this.bbox.minX) this.bbox.minX = x;
          if (x > this.bbox.maxX) this.bbox.maxX = x;
          if (y < this.bbox.minY) this.bbox.minY = y;
          if (y > this.bbox.maxY) this.bbox.maxY = y;
        }
      }
    }
  }

  /**
   * Obtiene una entidad por su handle
   * @param {string} handle 
   * @returns {CadEntity|null}
   */
  getEntityByHandle(handle) {
    if (!handle) return null;
    return this.entitiesByHandle.get(String(handle).toUpperCase()) || null;
  }

  /**
   * Obtiene todas las entidades de una capa específica
   * @param {string} layerName 
   * @returns {CadEntity[]}
   */
  getEntitiesByLayer(layerName) {
    return this.entitiesByLayer.get(layerName) || [];
  }

  /**
   * Obtiene todas las entidades de una categoría semántica
   * @param {string} category 
   * @returns {CadEntity[]}
   */
  getEntitiesByCategory(category) {
    return this.entitiesByCategory.get(category) || [];
  }

  /**
   * Retorna un resumen general del documento
   */
  getSummary() {
    const typeCounts = {};
    for (const ent of this.entities) {
      typeCounts[ent.type] = (typeCounts[ent.type] || 0) + 1;
    }

    return {
      file: this.file,
      totalEntities: this.entities.length,
      modelSpaceCount: this.entities.filter(e => e.space === 'model').length,
      paperSpaceCount: this.entities.filter(e => e.space === 'paper').length,
      layerCount: this.layers.size,
      blockCount: this.blocks.size,
      entityTypes: typeCounts,
      bbox: { ...this.bbox },
      units: {
        declaredUnits: this.header.$INSUNITS === 1 ? 'inches (1)' : String(this.header.$INSUNITS ?? 'unknown'),
        measurement: this.header.$MEASUREMENT === 0 ? 'imperial (0)' : String(this.header.$MEASUREMENT ?? 'unknown'),
        effectiveUnits: 'meters (UTM 18S WGS84, documentado)',
        acadVersion: this.header.$ACADVER || 'unknown'
      }
    };
  }
}

