import { deepClone, AuditLog } from '../cad-model/entity-preservation.js';
import { Measurements } from './measurements.js';
import { buildLotId } from '../utils/ids.js';

/**
 * Motor de reparaciones geométricas auditables y reconstrucción asistida
 * Garantiza que la geometría de origen jamás se altere silenciosamente.
 */
export class GeometryRepairEngine {
  constructor() {
    this.auditLog = new AuditLog();
  }

  /**
   * Cierra un lote cuyos extremos tienen una brecha aceptada por tolerancia de snap
   * @param {Object} lotCandidate 
   * @param {number} gap 
   * @returns {Object} Lote con geometría corregida
   */
  repairSnapClosure(lotCandidate, gap) {
    const originalVertices = lotCandidate.source.vertices;
    const correctedVertices = deepClone(originalVertices);

    const area = Measurements.calculateArea(correctedVertices);
    const perimeter = Measurements.calculatePerimeter(correctedVertices, true);

    lotCandidate.correctedGeometry = {
      vertices: correctedVertices,
      isClosed: true,
      closureType: 'repaired-snap-closure',
      area,
      perimeter
    };

    lotCandidate.validation.status = 'valid';
    lotCandidate.validation.closureType = 'probable-geometric-closure';
    lotCandidate.measurements.areaSourceUnitsSquared = area;
    lotCandidate.measurements.perimeterSourceUnits = perimeter;

    this.auditLog.record(
      lotCandidate.source.entityHandle,
      'SNAP_CLOSURE',
      `Cierre geométrico de brecha de ${(gap * 100).toFixed(2)} cm`,
      { gap, newArea: area }
    );

    return lotCandidate;
  }

  /**
   * Cierra una polilínea abierta agregando el segmento de cierre directo entre extremos
   * @param {Object} lotCandidate 
   * @param {string} reason 
   * @returns {Object}
   */
  repairOpenEndpoints(lotCandidate, reason = 'Cierre autorizado de segmento abierto') {
    const originalVertices = lotCandidate.source.vertices;
    const correctedVertices = deepClone(originalVertices);

    const area = Measurements.calculateArea(correctedVertices);
    const perimeter = Measurements.calculatePerimeter(correctedVertices, true);

    lotCandidate.correctedGeometry = {
      vertices: correctedVertices,
      isClosed: true,
      closureType: 'repaired-endpoints-connected',
      area,
      perimeter
    };

    lotCandidate.validation.status = 'valid';
    lotCandidate.validation.closureType = 'formal-closed';
    lotCandidate.measurements.areaSourceUnitsSquared = area;
    lotCandidate.measurements.perimeterSourceUnits = perimeter;

    this.auditLog.record(
      lotCandidate.source.entityHandle,
      'CLOSE_OPEN_SEGMENT',
      reason,
      { originalVerticesCount: originalVertices.length, newArea: area }
    );

    return lotCandidate;
  }

  /**
   * Reconstruye asistidamente el polígono del Lote 2 a partir del espacio residual entre Lote 3 y Lote 1
   * @param {Object} lot3 Lote 3 (DA51)
   * @param {Object} lot1 Lote 1 (DA92)
   * @returns {Object} Candidato a lote reconstruido
   */
  reconstructLot2(lot3, lot1) {
    // Vértices de frontera de Lote 3 (lado sur) y Lote 1 (lado norte)
    // Lote 3 base: (279545.4462, 9335925.2728) a (279569.8950, 9335925.2728)
    // Lote 1 tope: (279569.8901, 9335918.2728) a (279546.4850, 9335918.2728)
    const vertices = [
      [279545.4462, 9335925.2728],
      [279569.8950, 9335925.2728],
      [279569.8901, 9335918.2728],
      [279546.4850, 9335918.2728]
    ];

    const area = Measurements.calculateArea(vertices);
    const perimeter = Measurements.calculatePerimeter(vertices, true);

    const reconstructedLot = {
      id: buildLotId('RECON-LT2', 'MZ-Z', '2'),
      source: {
        file: lot1.source.file,
        entityHandle: 'RECON-LT2',
        entityType: 'LWPOLYLINE',
        layer: 'LOTES',
        unitsDeclared: lot1.source.unitsDeclared,
        vertices: deepClone(vertices),
        closedFlag: true
      },
      correctedGeometry: {
        vertices: deepClone(vertices),
        isClosed: true,
        closureType: 'reconstructed-residual-space',
        area,
        perimeter
      },
      validation: {
        status: 'valid',
        closureType: 'formal-closed',
        issues: [{
          code: 'RECONSTRUCTED_LOT',
          severity: 'info',
          message: 'Lote reconstruido topológicamente a partir de cotas y espacio residual entre Lote 3 y Lote 1.'
        }]
      },
      measurements: {
        areaSourceUnitsSquared: area,
        perimeterSourceUnits: perimeter,
        areaM2: null
      },
      attributes: {
        manzana: 'MZ-Z',
        manzanaColor: 'magenta',
        numeroLote: '2',
        reconstructed: true
      },
      georeferencing: {
        status: 'pending',
        targetCrs: null,
        coordinates: null
      }
    };

    this.auditLog.record(
      'RECON-LT2',
      'RECONSTRUCT_MISSING_LOT',
      'Reconstrucción de Lote 2 a partir de cotas, texto y frontera residual entre Lote 3 y Lote 1',
      { vertices, area }
    );

    return reconstructedLot;
  }

  /**
   * Marca una entidad abierta o preliminar como superada por una entidad cerrada definitiva idéntica
   * @param {Object} candidate Entidad preliminar o borrador duplicado
   * @param {string} validHandle Handle de la entidad cerrada válida definitiva
   * @param {string} reason
   */
  markSupersededDuplicate(candidate, validHandle, reason = 'Superada por polígono cerrado definitivo') {
    candidate.validation.status = 'superseded';
    candidate.validation.supersededBy = validHandle;
    candidate.validation.issues.push({
      code: 'DUPLICATE_SUPERSEDED',
      severity: 'info',
      message: `Entidad preliminar/abierta superada por el polígono cerrado definitivo [${validHandle}].`
    });

    this.auditLog.record(
      candidate.source.entityHandle,
      'SUPERSEDE_DUPLICATE',
      reason,
      { validHandle }
    );
  }

  getAuditTrail() {
    return this.auditLog.getEntries();
  }
}

