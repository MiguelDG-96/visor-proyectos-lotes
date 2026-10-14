import { buildLotId } from '../utils/ids.js';
import { DEFAULT_LOT_LAYERS } from '../config/layers.config.js';

/**
 * Extractor configurable de polígonos de lotes
 * Prioriza la capa LOTES sin mutar la geometría original
 */
export class LotExtractor {
  /**
   * @param {Object} [options]
   * @param {string[]} [options.targetLayers=DEFAULT_LOT_LAYERS]
   * @param {number} [options.closureTolerance=1e-4]
   */
  constructor(options = {}) {
    this.targetLayers = options.targetLayers || DEFAULT_LOT_LAYERS;
    this.closureTolerance = options.closureTolerance || 1e-4;
  }

  /**
   * Extrae la colección independiente de lotes candidatos desde un CadDocument
   * @param {import('../cad-model/cad-document.js').CadDocument} doc 
   * @returns {Object[]}
   */
  extract(doc) {
    const lotCandidates = [];
    const targetSet = new Set(this.targetLayers.map(l => l.toUpperCase()));

    // Recolectar textos de número de lote de 'numero lote' (sector sur) y 'PDF_Text' (sector norte)
    const lotNumberTexts = doc.entities.filter(
      e => (e.layer === 'numero lote' || e.layer === 'PDF_Text') && (e.source.text || e.source.value)
    );

    // Recolectar rótulos de manzanas de 'textc' (magenta) y 'MANZANEO' (celeste)
    const manzanaTexts = doc.entities.filter(
      e => (e.layer === 'textc' || e.layer === 'MANZANEO') && e.source.text
    );

    // Filtrar entidades polilíneas en las capas objetivo
    for (const entity of doc.entities) {
      if (!targetSet.has(entity.layer.toUpperCase())) {
        continue;
      }

      if (entity.type !== 'LWPOLYLINE' && entity.type !== 'POLYLINE') {
        continue;
      }

      const candidate = this._processCandidate(entity, doc);
      lotCandidates.push(candidate);
    }

    // Asociar números de lote espacialmente (Point-in-Polygon)
    this._associateLotNumbers(lotCandidates, lotNumberTexts);

    // Asociar manzana correspondiente a cada lote
    this._associateManzanas(lotCandidates, manzanaTexts);

    return lotCandidates;
  }

  /**
   * Procesa una entidad individual como candidato a lote
   * @param {import('../cad-model/cad-entity.js').CadEntity} entity 
   * @param {import('../cad-model/cad-document.js').CadDocument} doc 
   */
  _processCandidate(entity, doc) {
    const rawVertices = entity.getVertices();
    const vertexCount = rawVertices.length;
    const isFormallyClosed = entity.isClosed();

    let closureType = 'open';
    let status = 'valid';
    const issues = [];

    // Verificación de número de vértices
    if (vertexCount < 3) {
      status = 'invalid';
      closureType = 'open';
      issues.push({
        code: 'INSUFFICIENT_VERTICES',
        severity: 'error',
        message: `Polilínea con solo ${vertexCount} vértice(s); no puede formar polígono cerrado.`
      });
    } else {
      // Verificación de cierre
      if (isFormallyClosed) {
        closureType = 'formal-closed';
      } else {
        // Comprobar si primer y último vértice coinciden dentro de la tolerancia
        const first = rawVertices[0];
        const last = rawVertices[vertexCount - 1];
        const dx = first[0] - last[0];
        const dy = first[1] - last[1];
        const gap = Math.sqrt(dx * dx + dy * dy);

        if (gap <= this.closureTolerance) {
          closureType = 'probable-geometric-closure';
          status = 'valid';
          issues.push({
            code: 'GEOMETRIC_CLOSURE_DETECTED',
            severity: 'info',
            message: `Extremos coinciden con brecha de ${gap.toFixed(6)} u. Marcado como cierre geométrico probable.`
          });
        } else {
          closureType = 'open';
          status = 'needs-review';
          issues.push({
            code: 'OPEN_POLYLINE',
            severity: 'warning',
            message: `Polilínea abierta con brecha de ${gap.toFixed(4)} unidades entre extremos.`
          });
        }
      }
    }

    // Cálculo de métricas en unidades fuente
    const measurements = this._calculateMeasurements(rawVertices, isFormallyClosed || closureType === 'probable-geometric-closure');

    const lotId = buildLotId(entity.handle);

    return {
      id: lotId,
      source: {
        file: doc.file,
        entityHandle: entity.handle,
        entityType: entity.type,
        layer: entity.layer,
        unitsDeclared: doc.header.$INSUNITS === 1 ? 'inches (1)' : String(doc.header.$INSUNITS ?? 'unknown'),
        vertices: rawVertices, // Inmutable, conservado sin modificar
        closedFlag: isFormallyClosed
      },
      validation: {
        status,
        closureType,
        issues
      },
      measurements: {
        areaSourceUnitsSquared: measurements.area,
        perimeterSourceUnits: measurements.perimeter,
        areaM2: null // Null hasta que la conversión y CRS sean confirmados formalmente
      },
      attributes: {
        manzana: null,
        numeroLote: null
      },
      georeferencing: {
        status: 'pending',
        targetCrs: null,
        coordinates: null
      }
    };
  }

  /**
   * Cálculo de área y perímetro por fórmula del cordón de zapatos (Shoelace)
   * @param {number[][]} vertices 
   * @param {boolean} isClosed 
   */
  _calculateMeasurements(vertices, isClosed) {
    if (vertices.length < 3) {
      // Perímetro lineal simple para segmentos
      let perimeter = 0;
      for (let i = 0; i < vertices.length - 1; i++) {
        const dx = vertices[i + 1][0] - vertices[i][0];
        const dy = vertices[i + 1][1] - vertices[i][1];
        perimeter += Math.sqrt(dx * dx + dy * dy);
      }
      return { area: 0, perimeter };
    }

    let area = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i][0] * vertices[j][1];
      area -= vertices[j][0] * vertices[i][1];
    }
    area = Math.abs(area) / 2.0;

    let perimeter = 0;
    for (let i = 0; i < n - 1; i++) {
      const dx = vertices[i + 1][0] - vertices[i][0];
      const dy = vertices[i + 1][1] - vertices[i][1];
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    if (isClosed) {
      const dx = vertices[0][0] - vertices[n - 1][0];
      const dy = vertices[0][1] - vertices[n - 1][1];
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }

    return { area, perimeter };
  }

  /**
   * Asocia números de lote verificando si el punto de inserción del texto cae dentro del polígono
   * @param {Object[]} candidates 
   * @param {import('../cad-model/cad-entity.js').CadEntity[]} textEntities 
   */
  _associateLotNumbers(candidates, textEntities) {
    for (const textEnt of textEntities) {
      const pos = textEnt.source.startPoint || textEnt.source.middlePoint || textEnt.source.position;
      if (!pos) continue;
      const pt = [pos.x, pos.y];
      const textVal = String(textEnt.source.text ?? textEnt.source.value ?? '').trim();

      for (const cand of candidates) {
        if (cand.validation.status === 'valid' && this._isPointInPolygon(pt, cand.source.vertices)) {
          cand.attributes.numeroLote = textVal;
          break;
        }
      }
    }
  }

  /**
   * Asocia la manzana correspondiente a cada lote en función del rótulo de manzana más cercano/envolvente
   * @param {Object[]} candidates 
   * @param {import('../cad-model/cad-entity.js').CadEntity[]} manzanaTexts 
   */
  _associateManzanas(candidates, manzanaTexts) {
    if (!manzanaTexts || manzanaTexts.length === 0) return;

    for (const cand of candidates) {
      const v = cand.source.vertices;
      if (v.length < 3) continue;

      let cx = 0, cy = 0;
      for (const pt of v) {
        cx += pt[0];
        cy += pt[1];
      }
      cx /= v.length;
      cy /= v.length;

      let bestMz = null;
      let mzColor = 'magenta';

      // Sector norte (definido por capa MANZANEO en color celeste)
      if (cy > 9336480) {
        mzColor = 'celeste';
        if (cy > 9336570) {
          bestMz = 'Mz - C';
        } else if (cy > 9336520) {
          bestMz = 'Mz - D';
        } else {
          bestMz = cx < 279705 ? 'Mz - A' : 'Mz - B';
        }
      } else {
        // Sector sur (definido por capa 'textc' en color magenta)
        let minDist = Infinity;
        for (const mzEnt of manzanaTexts.filter(m => m.layer === 'textc')) {
          const p = mzEnt.source.startPoint || mzEnt.source.position;
          if (p) {
            const dist = Math.hypot(p.x - cx, p.y - cy);
            if (dist < minDist) {
              minDist = dist;
              bestMz = String(mzEnt.source.text).trim();
            }
          }
        }
      }

      cand.attributes.manzana = bestMz;
      cand.attributes.manzanaColor = mzColor;

      // Actualizar ID compuesto si se dispone de manzana y número de lote
      if (cand.attributes.manzana && cand.attributes.numeroLote) {
        cand.id = buildLotId(cand.source.entityHandle, cand.attributes.manzana, cand.attributes.numeroLote);
      }
    }
  }

  /**
   * Algoritmo Ray-Casting (Punto en Polígono)
   * @param {number[]} point [x, y]
   * @param {number[][]} polygon 
   * @returns {boolean}
   */
  _isPointInPolygon(point, polygon) {
    if (!polygon || polygon.length < 3) return false;
    const x = point[0];
    const y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
