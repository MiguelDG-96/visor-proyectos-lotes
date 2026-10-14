/**
 * Motor de Transformación de Similitud 2D de Helmert (4 Parámetros)
 * Conserva ángulos y proporciones de las figuras geométricas (sin deformación de lotes)
 * Modelo: X' = s * cos(θ) * X - s * sin(θ) * Y + Tx
 *         Y' = s * sin(θ) * X + s * cos(θ) * Y + Ty
 */

export class Helmert2D {
  /**
   * @param {Object} [params]
   * @param {number} [params.c=1] c = s * cos(θ)
   * @param {number} [params.d=0] d = s * sin(θ)
   * @param {number} [params.tx=0] Traslación en X
   * @param {number} [params.ty=0] Traslación en Y
   */
  constructor({ c = 1, d = 0, tx = 0, ty = 0 } = {}) {
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;

    this.scale = Math.hypot(c, d);
    this.rotationRad = Math.atan2(d, c);
    this.rotationDeg = this.rotationRad * (180 / Math.PI);
    this.rmse = 0;
    this.residuals = [];
    this.checkPointStats = null;
  }

  /**
   * Ajusta los 4 parámetros por Mínimos Cuadrados a partir de pares de puntos de control (GCP)
   * @param {Array<{x: number, y: number, targetX: number, targetY: number}>} controlPoints 
   * @param {Array<{x: number, y: number, targetX: number, targetY: number}>} [checkPoints=[]] Puntos de verificación independientes
   * @returns {Helmert2D}
   */
  static fit(controlPoints, checkPoints = []) {
    const n = controlPoints.length;
    if (n < 2) {
      throw new Error(`Se requieren al menos 2 puntos de control para Helmert 2D (recibidos: ${n})`);
    }

    // 1. Centroides de origen y destino
    let mx = 0, my = 0, mtx = 0, mty = 0;
    for (const p of controlPoints) {
      mx += p.x;
      my += p.y;
      mtx += p.targetX;
      mty += p.targetY;
    }
    mx /= n;
    my /= n;
    mtx /= n;
    mty /= n;

    // 2. Acumuladores de ecuaciones normales
    let num1 = 0, num2 = 0, den = 0;
    for (const p of controlPoints) {
      const dx = p.x - mx;
      const dy = p.y - my;
      const dtx = p.targetX - mtx;
      const dty = p.targetY - mty;

      num1 += dx * dtx + dy * dty;
      num2 += dx * dty - dy * dtx;
      den += dx * dx + dy * dy;
    }

    if (Math.abs(den) < 1e-12) {
      throw new Error('Puntos de control colapsados o coincidentes. No se puede calcular Helmert.');
    }

    const c = num1 / den;
    const d = num2 / den;
    const tx = mtx - (c * mx - d * my);
    const ty = mty - (d * mx + c * my);

    const instance = new Helmert2D({ c, d, tx, ty });

    // 3. Cálculo de residuales sobre puntos de control
    let sumSq = 0;
    instance.residuals = controlPoints.map((p, idx) => {
      const pred = instance.transform(p.x, p.y);
      const vx = p.targetX - pred.x;
      const vy = p.targetY - pred.y;
      const vTotal = Math.hypot(vx, vy);
      sumSq += vx * vx + vy * vy;
      return {
        id: p.id || `GCP_${idx + 1}`,
        x: p.x,
        y: p.y,
        targetX: p.targetX,
        targetY: p.targetY,
        predX: pred.x,
        predY: pred.y,
        vx,
        vy,
        vTotal
      };
    });

    // Grados de libertad: 2n - 4
    const dof = 2 * n - 4;
    instance.rmse = dof > 0 ? Math.sqrt(sumSq / dof) : Math.sqrt(sumSq / (2 * n));

    // 4. Verificación con Check Points independientes si existen
    if (checkPoints.length > 0) {
      let checkSumSq = 0;
      const checkResiduals = checkPoints.map((cp, idx) => {
        const pred = instance.transform(cp.x, cp.y);
        const vx = cp.targetX - pred.x;
        const vy = cp.targetY - pred.y;
        const vTotal = Math.hypot(vx, vy);
        checkSumSq += vx * vx + vy * vy;
        return {
          id: cp.id || `CHK_${idx + 1}`,
          vx,
          vy,
          vTotal
        };
      });

      instance.checkPointStats = {
        count: checkPoints.length,
        rmse: Math.sqrt(checkSumSq / (2 * checkPoints.length)),
        residuals: checkResiduals
      };
    }

    return instance;
  }

  /**
   * Transforma un punto de origen (X, Y) a destino (X', Y')
   * @param {number} x 
   * @param {number} y 
   * @returns {{x: number, y: number}}
   */
  transform(x, y) {
    return {
      x: this.c * x - this.d * y + this.tx,
      y: this.d * x + this.c * y + this.ty
    };
  }

  /**
   * Transforma inversamente un punto de destino (X', Y') a origen (X, Y)
   * @param {number} tx_target 
   * @param {number} ty_target 
   * @returns {{x: number, y: number}}
   */
  inverse(tx_target, ty_target) {
    const den = this.c * this.c + this.d * this.d;
    const dx = tx_target - this.tx;
    const dy = ty_target - this.ty;
    return {
      x: (this.c * dx + this.d * dy) / den,
      y: (-this.d * dx + this.c * dy) / den
    };
  }

  /**
   * Transforma un arreglo de vértices
   * @param {number[][]} vertices 
   * @returns {number[][]}
   */
  transformVertices(vertices) {
    return vertices.map(v => {
      const p = this.transform(v[0], v[1]);
      return [p.x, p.y];
    });
  }

  /**
   * Genera el informe técnico de calidad y precisión del ajuste
   * @returns {Object}
   */
  getQualityReport() {
    return {
      transformationType: 'Helmert 2D (Similarity - 4 parameters)',
      parameters: {
        scale: this.scale,
        rotationDeg: this.rotationDeg,
        rotationRad: this.rotationRad,
        translationX: this.tx,
        translationY: this.ty,
        c: this.c,
        d: this.d
      },
      quality: {
        rmseMeters: this.rmse,
        controlPointsCount: this.residuals.length,
        independentCheckPointsCount: this.checkPointStats?.count || 0,
        independentCheckRmseMeters: this.checkPointStats?.rmse || null,
        maxResidual: Math.max(...this.residuals.map(r => r.vTotal), 0)
      },
      residuals: this.residuals,
      isReliable: this.residuals.length >= 4 && this.rmse < 0.15 // Fiable si < 15 cm de error
    };
  }
}

