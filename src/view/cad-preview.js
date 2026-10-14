import { LayerManager } from './layer-manager.js';
import { MeasurementTool } from './measurement-tool.js';

/**
 * Visor interactivo 2D en Canvas para previsualización de polígonos CAD (Fase 4)
 * Mantiene intactas las coordenadas fuente sin mutación
 */
export class CadPreviewViewer {
  /**
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} [options]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lots = [];
    this.manzanaLabels = [];
    this.streetLabels = [];
    this.viewMode = options.viewMode || 'validated'; // 'validated' | 'raw'
    this.selectedLot = null;
    this.onSelectLot = options.onSelectLot || (() => {});
    this.onHoverCoords = options.onHoverCoords || (() => {});

    // Gestor de capas y herramienta de medición
    this.layerManager = options.layerManager || new LayerManager();
    this.measurementTool = new MeasurementTool();

    // Paquete de datos vectoriales multicapa
    this.layersData = {
      perimetro: [],
      vias: [],
      manzanaContornos: [],
      circulos: [],
      cotas: []
    };

    // Estado de la cámara (pan / zoom)
    this.view = {
      scale: 1,
      offsetX: 0,
      offsetY: 0
    };

    // Bounding Box del plano en coordenadas CAD
    this.bbox = {
      minX: 0,
      maxX: 100,
      minY: 0,
      maxY: 100
    };

    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };

    this._initEvents();

    // Re-renderizar automáticamente al cambiar capas
    this.layerManager.subscribe(() => {
      this.render();
    });
  }

  /**
   * Carga los datos vectoriales de capas adicionales
   * @param {Object} layersData 
   */
  setLayersData(layersData) {
    if (layersData) {
      this.layersData = {
        perimetro: layersData.perimetro || [],
        vias: layersData.vias || [],
        manzanaContornos: layersData.manzanaContornos || [],
        circulos: layersData.circulos || [],
        cotas: layersData.cotas || []
      };
      this._calculateBBox();
      this.render();
    }
  }

  /**
   * Cambia el modo de visualización entre geometría cruda DXF y validada/corregida
   * @param {'validated'|'raw'} mode 
   */
  setViewMode(mode) {
    this.viewMode = mode;
    this.render();
  }

  /**
   * Enfoca la cámara en unas coordenadas CAD específicas
   * @param {number} x Coordenada X CAD
   * @param {number} y Coordenada Y CAD
   * @param {number} scale Nivel de zoom
   */
  focusCoords(x, y, scale = 2.5) {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;

    this.view.scale = scale;
    this.view.offsetX = (width / 2) - (x * scale);
    this.view.offsetY = (height / 2) + (y * scale);
    this.render();
  }

  /**
   * Enfoca la vista sobre todos los lotes de una manzana específica
   * @param {string} manzanaName 
   */
  focusManzana(manzanaName) {
    if (!manzanaName) return;
    const norm = manzanaName.trim().toUpperCase();
    const mzLots = this.lots.filter(l => (l.attributes?.manzana || '').toUpperCase() === norm);
    if (mzLots.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const lot of mzLots) {
      const verts = (this.viewMode === 'validated' && lot.correctedGeometry?.vertices)
        ? lot.correctedGeometry.vertices
        : lot.source.vertices;
      for (const pt of verts) {
        if (pt[0] < minX) minX = pt[0];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] < minY) minY = pt[1];
        if (pt[1] > maxY) maxY = pt[1];
      }
    }

    if (minX === Infinity) return;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const padding = 60;

    const scaleX = (width - padding * 2) / spanX;
    const scaleY = (height - padding * 2) / spanY;
    this.view.scale = Math.min(scaleX, scaleY);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    this.view.offsetX = (width / 2) - (midX * this.view.scale);
    this.view.offsetY = (height / 2) + (midY * this.view.scale);
    this.render();
  }

  /**
   * Búsqueda inteligente de lote por número, manzana o handle
   * @param {string} query 
   * @returns {Object|null}
   */
  searchLot(query) {
    if (!query) return null;
    const q = query.trim().toUpperCase();

    // 1. Por Handle exacto o ID
    let found = this.lots.find(l =>
      l.source.entityHandle.toUpperCase() === q ||
      l.id.toUpperCase() === q
    );

    // 2. Por número de lote y manzana combinados (ej. "MZ-Z 1" o "MZ-B 18")
    if (!found) {
      const parts = q.split(/\s+/);
      if (parts.length >= 2) {
        const mzPart = parts[0];
        const numPart = parts[1];
        found = this.lots.find(l =>
          (l.attributes?.manzana || '').toUpperCase().includes(mzPart) &&
          String(l.attributes?.numeroLote || '').toUpperCase() === numPart
        );
      }
    }

    // 3. Por número de lote simple
    if (!found) {
      found = this.lots.find(l => String(l.attributes?.numeroLote || '').toUpperCase() === q);
    }

    if (found) {
      this.selectLot(found.source.entityHandle);
      const verts = (this.viewMode === 'validated' && found.correctedGeometry?.vertices)
        ? found.correctedGeometry.vertices
        : found.source.vertices;
      if (verts.length > 0) {
        const c = this._computeCentroid(verts);
        this.focusCoords(c[0], c[1], 3.5);
      }
    }

    return found || null;
  }

  /**
   * Carga la colección de lotes y rótulos a visualizar
   * @param {Object[]} lots 
   * @param {Object[]} [manzanaLabels=[]]
   * @param {Object[]} [streetLabels=[]]
   */
  setLots(lots, manzanaLabels = [], streetLabels = []) {
    this.lots = lots;
    this.manzanaLabels = manzanaLabels;
    this.streetLabels = streetLabels;
    this._calculateBBox();
    this.fitView();
  }

  /**
   * Selecciona un lote por su handle o ID
   * @param {string} handleOrId 
   */
  selectLot(handleOrId) {
    if (!handleOrId) {
      this.selectedLot = null;
    } else {
      const norm = String(handleOrId).toUpperCase();
      this.selectedLot = this.lots.find(
        l => l.source.entityHandle.toUpperCase() === norm || l.id.toUpperCase() === norm
      ) || null;
    }
    this.render();
    if (this.selectedLot) {
      this.onSelectLot(this.selectedLot);
    }
  }

  _calculateBBox() {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const lot of this.lots) {
      const vertices = lot.source.vertices;
      for (const pt of vertices) {
        if (pt[0] < minX) minX = pt[0];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] < minY) minY = pt[1];
        if (pt[1] > maxY) maxY = pt[1];
      }
    }

    // Incluir perímetro en BBox si está disponible
    if (this.layersData.perimetro.length > 0) {
      for (const p of this.layersData.perimetro) {
        for (const pt of p.vertices) {
          if (pt[0] < minX) minX = pt[0];
          if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] < minY) minY = pt[1];
          if (pt[1] > maxY) maxY = pt[1];
        }
      }
    }

    if (minX !== Infinity) {
      this.bbox = { minX, maxX, minY, maxY };
    }
  }

  /**
   * Ajusta la vista para que todo el plano encaje en el canvas
   */
  fitView() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;

    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;

    const spanX = this.bbox.maxX - this.bbox.minX || 1;
    const spanY = this.bbox.maxY - this.bbox.minY || 1;

    const padding = 40;
    const availableW = width - padding * 2;
    const availableH = height - padding * 2;

    const scaleX = availableW / spanX;
    const scaleY = availableH / spanY;
    this.view.scale = Math.min(scaleX, scaleY);

    // Centrar en pantalla
    const midX = (this.bbox.minX + this.bbox.maxX) / 2;
    const midY = (this.bbox.minY + this.bbox.maxY) / 2;

    this.view.offsetX = (width / 2) - (midX * this.view.scale);
    // En CAD Y crece hacia arriba; en pantalla Y crece hacia abajo
    this.view.offsetY = (height / 2) + (midY * this.view.scale);

    this.render();
  }

  /**
   * Conversión: Coordenadas CAD -> Coordenadas de pantalla
   */
  cadToScreen(x, y) {
    return {
      x: x * this.view.scale + this.view.offsetX,
      y: this.view.offsetY - y * this.view.scale
    };
  }

  /**
   * Conversión: Coordenadas de pantalla -> Coordenadas CAD
   */
  screenToCad(screenX, screenY) {
    return {
      x: (screenX - this.view.offsetX) / this.view.scale,
      y: (this.view.offsetY - screenY) / this.view.scale
    };
  }

  /**
   * Dibuja todas las capas activas sobre el canvas (60 fps)
   */
  render() {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Fondo oscuro profesional CAD
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);

    // 1. CAPA: Perímetro del proyecto (MATRIZ / PREDIO RURAL)
    if (this.layerManager.isVisible('perimetro') && this.layersData.perimetro.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      for (const p of this.layersData.perimetro) {
        if (p.vertices.length < 2) continue;
        ctx.beginPath();
        const p0 = this.cadToScreen(p.vertices[0][0], p.vertices[0][1]);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < p.vertices.length; i++) {
          const pt = this.cadToScreen(p.vertices[i][0], p.vertices[i][1]);
          ctx.lineTo(pt.x, pt.y);
        }
        if (p.closed) ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. CAPA: Vías y Calles (Líneas de borde y ejes)
    if (this.layerManager.isVisible('vias') && this.layersData.vias.length > 0) {
      ctx.save();
      for (const v of this.layersData.vias) {
        if (v.vertices.length < 2) continue;
        ctx.beginPath();
        const p0 = this.cadToScreen(v.vertices[0][0], v.vertices[0][1]);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < v.vertices.length; i++) {
          const pt = this.cadToScreen(v.vertices[i][0], v.vertices[i][1]);
          ctx.lineTo(pt.x, pt.y);
        }
        if (v.isCenterline) {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 4]);
        } else {
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([]);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. CAPA: Contornos de Manzanas
    if (this.layerManager.isVisible('manzanaContornos') && this.layersData.manzanaContornos.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      for (const m of this.layersData.manzanaContornos) {
        if (m.vertices.length < 2) continue;
        ctx.beginPath();
        const p0 = this.cadToScreen(m.vertices[0][0], m.vertices[0][1]);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < m.vertices.length; i++) {
          const pt = this.cadToScreen(m.vertices[i][0], m.vertices[i][1]);
          ctx.lineTo(pt.x, pt.y);
        }
        if (m.closed) ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. CAPA: Rótulos de Manzanas ('textc' en magenta, 'MANZANEO' en celeste)
    if (this.layerManager.isVisible('manzanaLabels') && this.manzanaLabels.length > 0) {
      ctx.save();
      for (const mz of this.manzanaLabels) {
        if (!mz.position) continue;
        const p = this.cadToScreen(mz.position.x, mz.position.y);
        const fontSize = Math.max(12, Math.min(60, (mz.height || 4.0) * this.view.scale * 1.8));
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        const isCeleste = mz.color === '#06b6d4' || mz.layer === 'MANZANEO';
        ctx.fillStyle = isCeleste ? 'rgba(6, 182, 212, 0.45)' : 'rgba(236, 72, 153, 0.35)';
        ctx.strokeStyle = isCeleste ? 'rgba(34, 211, 238, 0.85)' : 'rgba(236, 72, 153, 0.6)';
        ctx.lineWidth = 1;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(mz.text, p.x, p.y);
        ctx.fillText(mz.text, p.x, p.y);
      }
      ctx.restore();
    }

    // 5. CAPA: Rótulos de Calles
    if (this.layerManager.isVisible('streetLabels') && this.streetLabels.length > 0 && this.view.scale > 0.3) {
      ctx.save();
      for (const st of this.streetLabels) {
        if (!st.position) continue;
        const p = this.cadToScreen(st.position.x, st.position.y);
        const fontSize = Math.max(9, Math.min(16, 2.0 * this.view.scale));
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.text, p.x, p.y);
      }
      ctx.restore();
    }

    // 6. CAPA: Lotes (Polígonos de lote)
    if (this.layerManager.isVisible('lotes')) {
      for (const lot of this.lots) {
        if (this.viewMode === 'validated' && lot.validation.status === 'superseded') {
          continue; // Omitir borradores duplicados en modo validado
        }
        if (this.viewMode === 'raw' && lot.attributes?.reconstructed) {
          continue; // Omitir reconstrucciones en modo crudo
        }

        const isSelected = this.selectedLot && this.selectedLot.id === lot.id;
        const vertices = (this.viewMode === 'validated' && lot.correctedGeometry?.vertices)
          ? lot.correctedGeometry.vertices
          : lot.source.vertices;

        if (vertices.length < 2) continue;

        ctx.beginPath();
        const p0 = this.cadToScreen(vertices[0][0], vertices[0][1]);
        ctx.moveTo(p0.x, p0.y);

        for (let i = 1; i < vertices.length; i++) {
          const p = this.cadToScreen(vertices[i][0], vertices[i][1]);
          ctx.lineTo(p.x, p.y);
        }

        const isClosed = (this.viewMode === 'validated' && lot.correctedGeometry?.isClosed) ||
                         (this.viewMode === 'raw' ? lot.source.closedFlag : (
                           lot.validation.closureType === 'formal-closed' ||
                           lot.validation.closureType === 'probable-geometric-closure'
                         ));

        if (isClosed) {
          ctx.closePath();
        }

        // Estilos según estado y modo
        if (isSelected) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.5;
          ctx.fill();
        } else if (lot.source.entityHandle === 'D528') {
          ctx.fillStyle = 'rgba(236, 72, 153, 0.35)';
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2;
          ctx.fill();
        } else if (this.viewMode === 'validated' && lot.attributes?.reconstructed) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.fill();
        } else if (this.viewMode === 'validated' && lot.correctedGeometry?.closureType === 'repaired-snap-closure') {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.fill();
        } else if (lot.validation.status === 'invalid') {
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 1;
        } else if (this.viewMode === 'raw' && (!lot.source.closedFlag && lot.validation.closureType !== 'formal-closed')) {
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
        } else if (lot.validation.closureType === 'open') {
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
        } else if (lot.validation.closureType === 'probable-geometric-closure') {
          ctx.fillStyle = 'rgba(20, 184, 166, 0.15)';
          ctx.strokeStyle = '#14b8a6';
          ctx.lineWidth = 1;
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1;
          ctx.fill();
        }

        ctx.stroke();

        // 7. CAPA: Números de Lote
        if (this.layerManager.isVisible('numerosLote') && this.view.scale > 0.4 && lot.attributes?.numeroLote && vertices.length >= 3) {
          const centroid = this._computeCentroid(vertices);
          const screenCentroid = this.cadToScreen(centroid[0], centroid[1]);
          const numFontSize = Math.max(9, Math.min(18, 1.3 * this.view.scale));
          ctx.fillStyle = isSelected ? '#ffffff' : (lot.attributes.reconstructed ? '#34d399' : '#93c5fd');
          ctx.font = `bold ${numFontSize}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(lot.attributes.numeroLote, screenCentroid.x, screenCentroid.y);
        }
      }
    }

    // 8. CAPA: Círculos de número de lote
    if (this.layerManager.isVisible('circulos') && this.layersData.circulos.length > 0 && this.view.scale > 0.35) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      for (const c of this.layersData.circulos) {
        const sc = this.cadToScreen(c.center[0], c.center[1]);
        const rScreen = c.radius * this.view.scale;
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, rScreen, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 9. CAPA: Cotas y Medidas técnicas
    if (this.layerManager.isVisible('cotas') && this.layersData.cotas.length > 0 && this.view.scale > 0.8) {
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const cota of this.layersData.cotas) {
        const sp = this.cadToScreen(cota.x, cota.y);
        // Omitir si cae fuera de pantalla
        if (sp.x < 0 || sp.x > width || sp.y < 0 || sp.y > height) continue;
        ctx.fillText(cota.text, sp.x, sp.y);
      }
      ctx.restore();
    }

    // 10. HERRAMIENTA DE MEDICIÓN INTERACTIVA
    this.measurementTool.render(ctx, (x, y) => this.cadToScreen(x, y));

    ctx.restore();
  }

  _computeCentroid(vertices) {
    let cx = 0, cy = 0;
    for (const v of vertices) {
      cx += v[0];
      cy += v[1];
    }
    return [cx / vertices.length, cy / vertices.length];
  }

  _initEvents() {
    window.addEventListener('resize', () => {
      this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
      this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
      this.render();
    });

    // Pan / Arrastre
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 && !this.measurementTool.active) {
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const cadCoord = this.screenToCad(mouseX, mouseY);
      this.onHoverCoords(cadCoord);

      if (this.measurementTool.active) {
        this.measurementTool.updateCursor(cadCoord);
        this.render();
      }

      if (this.isDragging) {
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        this.view.offsetX += dx;
        this.view.offsetY += dy;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.render();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Zoom con rueda del ratón centrado en el cursor
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newScale = Math.max(0.01, Math.min(100, this.view.scale * zoomFactor));

      this.view.offsetX = mouseX - (mouseX - this.view.offsetX) * (newScale / this.view.scale);
      this.view.offsetY = mouseY - (mouseY - this.view.offsetY) * (newScale / this.view.scale);
      this.view.scale = newScale;

      this.render();
    }, { passive: false });

    // Clic para medición o selección de lote
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const cadPoint = this.screenToCad(mouseX, mouseY);

      // Si la herramienta de medición está activa, toma el punto
      if (this.measurementTool.active) {
        this.measurementTool.addPoint(cadPoint);
        this.render();
        return;
      }

      let found = null;
      for (const lot of this.lots) {
        if (this.viewMode === 'validated' && lot.validation.status === 'superseded') {
          continue;
        }
        if (this.viewMode === 'raw' && lot.attributes?.reconstructed) {
          continue;
        }
        const vertices = (this.viewMode === 'validated' && lot.correctedGeometry?.vertices)
          ? lot.correctedGeometry.vertices
          : lot.source.vertices;

        if (vertices.length >= 3 && this._isPointInPolygon([cadPoint.x, cadPoint.y], vertices)) {
          found = lot;
          break;
        }
      }

      this.selectedLot = found;
      this.render();
      this.onSelectLot(found);
    });

    // Clic derecho o tecla Escape cancela medición
    this.canvas.addEventListener('contextmenu', (e) => {
      if (this.measurementTool.active) {
        e.preventDefault();
        this.measurementTool.clear();
        this.render();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.measurementTool.active) {
          this.measurementTool.clear();
          this.render();
        }
      }
    });
  }

  _isPointInPolygon(point, polygon) {
    const x = point[0], y = point[1];
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
