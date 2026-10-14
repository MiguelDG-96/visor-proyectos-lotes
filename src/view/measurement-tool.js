/**
 * Herramienta de medición interactiva de distancias en metros reales CAD (UTM 18S)
 */

export class MeasurementTool {
  constructor() {
    this.active = false;
    this.points = []; // [{x, y}] en coordenadas CAD
    this.currentMouseCad = null;
    this.listeners = new Set();
  }

  /**
   * Activa o desactiva la herramienta de medición
   * @param {boolean} active 
   */
  setActive(active) {
    this.active = !!active;
    if (!this.active) {
      this.clear();
    }
    this._notify();
  }

  /**
   * Alterna la herramienta
   */
  toggle() {
    this.setActive(!this.active);
  }

  /**
   * Registra un clic en coordenadas CAD
   * @param {{x: number, y: number}} cadPoint 
   */
  addPoint(cadPoint) {
    if (!this.active || !cadPoint) return false;

    if (this.points.length >= 2) {
      this.points = [cadPoint]; // Iniciar nueva medición
    } else {
      this.points.push(cadPoint);
    }

    this._notify();
    return true;
  }

  /**
   * Actualiza la posición del cursor en coordenadas CAD para el segmento dinámico
   * @param {{x: number, y: number}} cadPoint 
   */
  updateCursor(cadPoint) {
    if (!this.active) return;
    this.currentMouseCad = cadPoint;
  }

  /**
   * Limpia la medición actual
   */
  clear() {
    this.points = [];
    this.currentMouseCad = null;
    this._notify();
  }

  /**
   * Obtiene la distancia euclidiana medida en metros reales
   * @returns {{ distance: number, dx: number, dy: number } | null}
   */
  getMeasurement() {
    if (this.points.length === 2) {
      const p1 = this.points[0];
      const p2 = this.points[1];
      const dx = Math.abs(p2.x - p1.x);
      const dy = Math.abs(p2.y - p1.y);
      const distance = Math.hypot(dx, dy);
      return { distance, dx, dy, p1, p2, fixed: true };
    }

    if (this.points.length === 1 && this.currentMouseCad) {
      const p1 = this.points[0];
      const p2 = this.currentMouseCad;
      const dx = Math.abs(p2.x - p1.x);
      const dy = Math.abs(p2.y - p1.y);
      const distance = Math.hypot(dx, dy);
      return { distance, dx, dy, p1, p2, fixed: false };
    }

    return null;
  }

  /**
   * Dibuja la línea de medición y etiqueta sobre el canvas
   * @param {CanvasRenderingContext2D} ctx 
   * @param {Function} cadToScreen Conversor de coordenadas
   */
  render(ctx, cadToScreen) {
    if (!this.active) return;

    const measurement = this.getMeasurement();
    if (!measurement) {
      if (this.points.length === 1) {
        const p = cadToScreen(this.points[0].x, this.points[0].y);
        ctx.save();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    const { distance, p1, p2, fixed } = measurement;
    const s1 = cadToScreen(p1.x, p1.y);
    const s2 = cadToScreen(p2.x, p2.y);

    ctx.save();

    // Línea de medición
    ctx.strokeStyle = fixed ? '#10b981' : '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Puntos extremos
    ctx.fillStyle = fixed ? '#10b981' : '#f59e0b';
    for (const s of [s1, s2]) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Etiqueta con la distancia
    const midX = (s1.x + s2.x) / 2;
    const midY = (s1.y + s2.y) / 2;
    const text = `${distance.toFixed(2)} m`;

    ctx.font = 'bold 12px monospace';
    const textWidth = ctx.measureText(text).width;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(midX - textWidth / 2 - 6, midY - 18, textWidth + 12, 22);
    ctx.strokeStyle = fixed ? '#10b981' : '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(midX - textWidth / 2 - 6, midY - 18, textWidth + 12, 22);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, midX, midY - 7);

    ctx.restore();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify() {
    for (const listener of this.listeners) {
      listener({ active: this.active, measurement: this.getMeasurement() });
    }
  }
}

