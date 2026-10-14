/**
 * Motor de Transformación Afín 2D (6 Parámetros)
 * Permite escalas independientes (sx ≠ sy) y cizallamiento (shear)
 * Modelo: X' = a10 + a11 * X + a12 * Y
 *         Y' = a20 + a21 * X + a22 * Y
 */

export class Affine2D {
  /**
   * @param {Object} [params]
   * @param {number} [params.a10=0] Traslación en X
   * @param {number} [params.a11=1]
   * @param {number} [params.a12=0]
   * @param {number} [params.a20=0] Traslación en Y
   * @param {number} [params.a21=0]
   * @param {number} [params.a22=1]
   */
  constructor({ a10 = 0, a11 = 1, a12 = 0, a20 = 0, a21 = 0, a22 = 1 } = {}) {
    this.a10 = a10;
    this.a11 = a11;
    this.a12 = a12;
    this.a20 = a20;
    this.a21 = a21;
    this.a22 = a22;

    // Descomposición física de parámetros
    this.scaleX = Math.hypot(a11, a21);
    this.scaleY = Math.hypot(a12, a22);
    this.rotationXDeg = Math.atan2(a21, a11) * (180 / Math.PI);
    this.rotationYDeg = Math.atan2(-a12, a22) * (180 / Math.PI);

    // No ortogonalidad (desviación del ángulo de 90° entre ejes X e Y)
    this.nonOrthogonalityDeg = Math.abs(this.rotationXDeg - this.rotationYDeg);
    this.differentialScale = Math.abs(this.scaleX - this.scaleY);

    this.rmse = 0;
    this.residuals = [];
  }

  /**
   * Ajusta los 6 parámetros por Mínimos Cuadrados (Regresión multivariable)
   * @param {Array<{x: number, y: number, targetX: number, targetY: number}>} points 
   * @returns {Affine2D}
   */
  static fit(points) {
    const n = points.length;
    if (n < 3) {
      throw new Error(`Se requieren al menos 3 puntos de control no colineales para Transformación Afín (recibidos: ${n})`);
    }

    // Matriz de diseño normal ATA (3x3): [n, Σx, Σy; Σx, Σx², Σxy; Σy, Σxy, Σy²]
    let sX = 0, sY = 0, sX2 = 0, sY2 = 0, sXY = 0;
    let sTx = 0, sTy = 0, sXTx = 0, sYTx = 0, sXTy = 0, sYTy = 0;

    for (const p of points) {
      sX += p.x;
      sY += p.y;
      sX2 += p.x * p.x;
      sY2 += p.y * p.y;
      sXY += p.x * p.y;

      sTx += p.targetX;
      sTy += p.targetY;
      sXTx += p.x * p.targetX;
      sYTx += p.y * p.targetX;
      sXTy += p.x * p.targetY;
      sYTy += p.y * p.targetY;
    }

    const ATA = [
      [n, sX, sY],
      [sX, sX2, sXY],
      [sY, sXY, sY2]
    ];

    const AT_Bx = [sTx, sXTx, sYTx];
    const AT_By = [sTy, sXTy, sYTy];

    const invATA = Affine2D._invert3x3(ATA);
    if (!invATA) {
      throw new Error('Matriz singular. Puntos de control colineales o geométricamente degenerados.');
    }

    // Resolver a1 = inv(ATA) * AT_Bx
    const a10 = invATA[0][0] * AT_Bx[0] + invATA[0][1] * AT_Bx[1] + invATA[0][2] * AT_Bx[2];
    const a11 = invATA[1][0] * AT_Bx[0] + invATA[1][1] * AT_Bx[1] + invATA[1][2] * AT_Bx[2];
    const a12 = invATA[2][0] * AT_Bx[0] + invATA[2][1] * AT_Bx[1] + invATA[2][2] * AT_Bx[2];

    // Resolver a2 = inv(ATA) * AT_By
    const a20 = invATA[0][0] * AT_By[0] + invATA[0][1] * AT_By[1] + invATA[0][2] * AT_By[2];
    const a21 = invATA[1][0] * AT_By[0] + invATA[1][1] * AT_By[1] + invATA[1][2] * AT_By[2];
    const a22 = invATA[2][0] * AT_By[0] + invATA[2][1] * AT_By[1] + invATA[2][2] * AT_By[2];

    const instance = new Affine2D({ a10, a11, a12, a20, a21, a22 });

    // Residuales
    let sumSq = 0;
    instance.residuals = points.map((p, idx) => {
      const pred = instance.transform(p.x, p.y);
      const vx = p.targetX - pred.x;
      const vy = p.targetY - pred.y;
      const vTotal = Math.hypot(vx, vy);
      sumSq += vx * vx + vy * vy;
      return {
        id: p.id || `GCP_${idx + 1}`,
        vx,
        vy,
        vTotal
      };
    });

    const dof = 2 * n - 6;
    instance.rmse = dof > 0 ? Math.sqrt(sumSq / dof) : Math.sqrt(sumSq / (2 * n));

    return instance;
  }

  /**
   * Transforma un punto (X, Y) -> (X', Y')
   * @param {number} x 
   * @param {number} y 
   * @returns {{x: number, y: number}}
   */
  transform(x, y) {
    return {
      x: this.a10 + this.a11 * x + this.a12 * y,
      y: this.a20 + this.a21 * x + this.a22 * y
    };
  }

  /**
   * Inversión matricial 3x3 por cofactores
   * @private
   */
  static _invert3x3(A) {
    const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
                A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
                A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

    if (Math.abs(det) < 1e-15) return null;
    const invDet = 1 / det;

    return [
      [
        (A[1][1] * A[2][2] - A[1][2] * A[2][1]) * invDet,
        (A[0][2] * A[2][1] - A[0][1] * A[2][2]) * invDet,
        (A[0][1] * A[1][2] - A[0][2] * A[1][1]) * invDet
      ],
      [
        (A[1][2] * A[2][0] - A[1][0] * A[2][2]) * invDet,
        (A[0][0] * A[2][2] - A[0][2] * A[2][0]) * invDet,
        (A[0][2] * A[1][0] - A[0][0] * A[1][2]) * invDet
      ],
      [
        (A[1][0] * A[2][1] - A[1][1] * A[2][0]) * invDet,
        (A[0][1] * A[2][0] - A[0][0] * A[2][1]) * invDet,
        (A[0][0] * A[1][1] - A[0][1] * A[1][0]) * invDet
      ]
    ];
  }

  getQualityReport() {
    return {
      transformationType: 'Affine 2D (General - 6 parameters)',
      parameters: {
        a10: this.a10, a11: this.a11, a12: this.a12,
        a20: this.a20, a21: this.a21, a22: this.a22,
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        differentialScale: this.differentialScale,
        rotationXDeg: this.rotationXDeg,
        rotationYDeg: this.rotationYDeg,
        nonOrthogonalityDeg: this.nonOrthogonalityDeg
      },
      quality: {
        rmseMeters: this.rmse,
        controlPointsCount: this.residuals.length
      },
      warning: this.differentialScale > 0.02 || this.nonOrthogonalityDeg > 0.5
        ? 'ADVERTENCIA: La transformación afín introduce deformación angular/escalar en los lotes. Si la fuente es un plano CAD real, se recomienda utilizar Helmert 2D para preservar ángulos rectos.'
        : 'Deformación afín dentro de límites tolerables.'
    };
  }
}

