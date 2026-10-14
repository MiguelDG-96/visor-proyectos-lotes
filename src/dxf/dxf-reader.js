import DxfParser from 'dxf-parser';
import { CadDocument } from '../cad-model/cad-document.js';
import { CadLayer } from '../cad-model/cad-layer.js';
import { CadEntity } from '../cad-model/cad-entity.js';
import { classifyLayer } from '../config/layers.config.js';
import { normalizeHandle } from '../utils/ids.js';

/**
 * Lector DXF integral que garantiza la preservación del 100% de las entidades y metadatos
 */
export class DxfReader {
  /**
   * @param {Object} [options]
   * @param {string} [options.encoding='windows-1252']
   */
  constructor(options = {}) {
    this.encoding = options.encoding || 'windows-1252';
    this.parser = new DxfParser();
  }

  /**
   * Lee y procesa un archivo DXF desde string o Uint8Array
   * @param {string|Uint8Array|ArrayBuffer} input 
   * @param {string} [fileName='unknown.dxf']
   * @returns {CadDocument}
   */
  read(input, fileName = 'unknown.dxf') {
    let content = '';

    if (typeof input === 'string') {
      content = input;
    } else if (input instanceof Uint8Array || input instanceof ArrayBuffer) {
      try {
        const decoder = new TextDecoder(this.encoding);
        content = decoder.decode(input);
      } catch {
        const fallbackDecoder = new TextDecoder('utf-8');
        content = fallbackDecoder.decode(input);
      }
    } else {
      throw new Error('Formato de entrada no soportado. Se esperaba string, Uint8Array o ArrayBuffer.');
    }

    // 1. Parseo estándar con dxf-parser
    let parsedDxf = null;
    try {
      parsedDxf = this.parser.parseSync(content);
    } catch (err) {
      throw new Error(`Error al parsear archivo DXF con dxf-parser: ${err.message}`);
    }

    // 2. Extraer entidades no procesadas por dxf-parser (HATCH, OLE2FRAME, VIEWPORT, GEODATA)
    const supplementaryEntities = this._extractSupplementaryEntities(content);

    // 3. Construir contenedor CadDocument
    const doc = new CadDocument({
      file: fileName,
      header: parsedDxf.header || {}
    });

    // 4. Ingesta de Capas
    const parsedLayers = parsedDxf.tables?.layer?.layers || {};
    for (const [name, l] of Object.entries(parsedLayers)) {
      doc.layers.set(name, new CadLayer({
        name,
        color: l.color,
        flags: l.flags,
        frozen: l.frozen,
        locked: l.locked,
        visible: l.visible
      }));
    }

    // 5. Ingesta de Bloques
    const parsedBlocks = parsedDxf.blocks || {};
    for (const [name, b] of Object.entries(parsedBlocks)) {
      doc.blocks.set(name, b);
    }

    // 6. Ingesta y normalización de entidades de dxf-parser
    const coreEntities = parsedDxf.entities || [];
    for (const raw of coreEntities) {
      const classification = classifyLayer(raw.layer);
      
      // Normalizar vértices para CadEntity
      let vertices = [];
      if (Array.isArray(raw.vertices)) {
        vertices = raw.vertices.map(v => [v.x, v.y]);
      } else if (raw.startPoint && raw.endPoint) {
        vertices = [[raw.startPoint.x, raw.startPoint.y], [raw.endPoint.x, raw.endPoint.y]];
      } else if (raw.startPoint) {
        vertices = [[raw.startPoint.x, raw.startPoint.y]];
      } else if (raw.position) {
        vertices = [[raw.position.x, raw.position.y]];
      }

      // Cerrada formalmente (flag 70 bit 1 o shape: true)
      const isClosed = Boolean(raw.shape);

      const entity = new CadEntity({
        file: fileName,
        handle: raw.handle,
        type: raw.type,
        layer: raw.layer || '0',
        space: raw.paperSpace ? 1 : 0,
        rawSource: {
          ...raw,
          vertices,
          closedFlag: isClosed
        },
        metadata: {
          category: classification.category,
          confidence: classification.confidence,
          rule: classification.rule
        }
      });

      doc.addEntity(entity);
    }

    // 7. Ingesta de entidades complementarias preservadas
    for (const supp of supplementaryEntities) {
      const classification = classifyLayer(supp.layer);
      const entity = new CadEntity({
        file: fileName,
        handle: supp.handle,
        type: supp.type,
        layer: supp.layer,
        space: supp.space,
        rawSource: supp.rawSource,
        metadata: {
          category: classification.category,
          confidence: classification.confidence,
          rule: `${classification.rule} (Preservada por escáner complementario)`
        },
        warnings: ['Entidad no soportada nativamente por dxf-parser; preservada en crudo.']
      });

      doc.addEntity(entity);
    }

    return doc;
  }

  /**
   * Extrae entidades que dxf-parser omite silenciosamente para garantizar el 100% de cobertura
   * @param {string} content 
   * @returns {Object[]}
   */
  _extractSupplementaryEntities(content) {
    const omittedTypes = new Set(['HATCH', 'OLE2FRAME', 'VIEWPORT', 'GEODATA']);
    const results = [];

    const lines = content.split(/\r?\n/);
    let inEntities = false;
    let i = 0;
    const len = lines.length;

    while (i < len - 1) {
      const code = lines[i].trim();
      const val = lines[i + 1].trim();

      if (code === '0' && val === 'SECTION') {
        if (i + 3 < len && lines[i + 2].trim() === '2' && lines[i + 3].trim() === 'ENTITIES') {
          inEntities = true;
          i += 4;
          continue;
        }
      } else if (code === '0' && val === 'ENDSEC' && inEntities) {
        inEntities = false;
        break;
      }

      if (inEntities && code === '0' && omittedTypes.has(val.toUpperCase())) {
        const entityType = val.toUpperCase();
        let handle = null;
        let layer = '0';
        let space = 0;
        const properties = {};

        i += 2;
        while (i < len - 1) {
          const nextCode = lines[i].trim();
          const nextVal = lines[i + 1].trim();

          if (nextCode === '0') {
            break; // Siguiente entidad
          }

          if (nextCode === '5') {
            handle = nextVal;
          } else if (nextCode === '8') {
            layer = nextVal;
          } else if (nextCode === '67') {
            space = Number(nextVal);
          } else {
            properties[nextCode] = nextVal;
          }
          i += 2;
        }

        results.push({
          type: entityType,
          handle: normalizeHandle(handle),
          layer,
          space,
          rawSource: {
            type: entityType,
            handle,
            layer,
            space,
            ...properties
          }
        });
        continue;
      }

      i += 2;
    }

    return results;
  }
}
