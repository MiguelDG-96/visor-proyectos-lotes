import { Helmert2D } from './helmert-transform.js';
import { Affine2D } from './affine-transform.js';

/**
 * Gestor de Puntos de Control de Terreno (GCP - Ground Control Points)
 * Audita residuales, detecta outliers y compara transformaciones Helmert vs Afín
 */

export class GcpManager {
  constructor() {
    this.points = []; // [{ id, name, x, y, targetX, targetY, isCheckPoint: false, description }]
  }

  /**
   * Añade o actualiza un punto de control
   * @param {Object} gcp 
   */
  addPoint(gcp) {
    if (!gcp.id) {
      gcp.id = `GCP_${this.points.length + 1}`;
    }
    const existingIdx = this.points.findIndex(p => p.id === gcp.id);
    if (existingIdx >= 0) {
      this.points[existingIdx] = { ...this.points[existingIdx], ...gcp };
    } else {
      this.points.push({
        id: gcp.id,
        name: gcp.name || gcp.id,
        x: Number(gcp.x),
        y: Number(gcp.y),
        targetX: Number(gcp.targetX),
        targetY: Number(gcp.targetY),
        isCheckPoint: !!gcp.isCheckPoint,
        description: gcp.description || ''
      });
    }
  }

  /**
   * Elimina un punto de control
   * @param {string} id 
   */
  removePoint(id) {
    this.points = this.points.filter(p => p.id !== id);
  }

  /**
   * Obtiene los puntos designados para ajuste (no check points)
   */
  getCalibrationPoints() {
    return this.points.filter(p => !p.isCheckPoint);
  }

  /**
   * Obtiene los puntos reservados exclusivamente para verificación independiente
   */
  getCheckPoints() {
    return this.points.filter(p => !!p.isCheckPoint);
  }

  /**
   * Ejecuta el ajuste de georreferenciación comparativo
   * @returns {{ helmert: Helmert2D, affine: Affine2D|null, recommendation: string, comparison: Object }}
   */
  calibrate() {
    const calibPts = this.getCalibrationPoints();
    const checkPts = this.getCheckPoints();

    if (calibPts.length < 2) {
      throw new Error(`Se requieren al menos 2 puntos de control para calcular la georreferenciación (actuales: ${calibPts.length})`);
    }

    const helmert = Helmert2D.fit(calibPts, checkPts);
    let affine = null;

    if (calibPts.length >= 3) {
      try {
        affine = Affine2D.fit(calibPts);
      } catch (e) {
        console.warn('No se pudo calcular ajuste afín:', e.message);
      }
    }

    // Evaluación técnica objetiva
    let recommendation = 'Helmert 2D (Similitud)';
    let justification = 'Conserva estrictamente los ángulos rectos y la geometría catastral original sin distorsión.';

    if (affine && affine.rmse < helmert.rmse * 0.5 && affine.nonOrthogonalityDeg < 0.2) {
      recommendation = 'Affine 2D (Afín justificado)';
      justification = 'La mejora en RMSE es sustancial y la deformación angular es inferior a 0.2°.';
    } else if (affine && affine.nonOrthogonalityDeg > 0.5) {
      recommendation = 'Helmert 2D (Similitud Obligatoria)';
      justification = `El modelo afín deforma los lotes con una no-ortogonalidad de ${affine.nonOrthogonalityDeg.toFixed(2)}°. Rechazado para proteger la validez legal del plano.`;
    }

    return {
      helmert,
      affine,
      recommendation,
      justification,
      comparison: {
        helmertRmse: helmert.rmse,
        affineRmse: affine?.rmse ?? null,
        independentCheckRmse: helmert.checkPointStats?.rmse ?? null,
        pointsUsed: calibPts.length,
        checkPointsUsed: checkPts.length
      }
    };
  }

  /**
   * Exporta la colección de puntos de control a formato JSON
   * @returns {string}
   */
  exportJson() {
    return JSON.stringify(this.points, null, 2);
  }

  /**
   * Exporta los puntos de control a formato CSV estándar GIS
   * @returns {string}
   */
  exportCsv() {
    const headers = 'ID,NAME,SOURCE_X,SOURCE_Y,TARGET_X,TARGET_Y,IS_CHECK_POINT,DESCRIPTION\n';
    const rows = this.points.map(p =>
      `"${p.id}","${p.name}",${p.x},${p.y},${p.targetX},${p.targetY},${p.isCheckPoint ? 1 : 0},"${p.description}"`
    ).join('\n');
    return headers + rows;
  }

  /**
   * Importa puntos desde un objeto o arreglo
   * @param {Array} list 
   */
  importPoints(list) {
    if (Array.isArray(list)) {
      list.forEach(p => this.addPoint(p));
    }
  }
}
