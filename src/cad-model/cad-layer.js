import { aciToHex } from '../utils/format.js';

/**
 * Representa una capa CAD con sus propiedades y estadísticas de entidades contenidas
 */
export class CadLayer {
  constructor({
    name,
    color = null,
    flags = 0,
    frozen = false,
    locked = false,
    visible = true,
    linetype = 'CONTINUOUS'
  }) {
    this.name = name;
    this.colorNumber = color;
    this.colorHex = aciToHex(color);
    this.flags = flags;
    this.frozen = Boolean(frozen);
    this.locked = Boolean(locked);
    this.visible = Boolean(visible);
    this.linetype = linetype;
    
    // Estadísticas
    this.entityCount = 0;
    this.entityTypeCounts = {};
  }

  addEntity(entityType) {
    this.entityCount += 1;
    const type = (entityType || 'UNKNOWN').toUpperCase();
    this.entityTypeCounts[type] = (this.entityTypeCounts[type] || 0) + 1;
  }

  toJSON() {
    return {
      name: this.name,
      colorNumber: this.colorNumber,
      colorHex: this.colorHex,
      flags: this.flags,
      frozen: this.frozen,
      locked: this.locked,
      visible: this.visible,
      linetype: this.linetype,
      entityCount: this.entityCount,
      entityTypeCounts: this.entityTypeCounts
    };
  }
}

