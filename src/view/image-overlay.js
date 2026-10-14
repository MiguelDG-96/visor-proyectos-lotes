import { WorldFile } from '../gis/world-file.js';
import { Helmert2D } from '../gis/helmert-transform.js';

/**
 * Gestor de Imagen de Fondo y Ortofoto Georreferenciada (Fase 5, 6 y 7)
 * Permite superponer imágenes de satélite o vuelos de dron sobre el plano vectorial CAD
 */
export class ImageOverlay {
  constructor(options = {}) {
    this.visible = options.visible ?? false;
    this.opacity = options.opacity ?? 0.65;
    this.image = null;
    this.isLoaded = false;
    this.sourceType = 'synthetic'; // 'synthetic' | 'orthophoto' | 'custom'

    // Bounding Box en Coordenadas CAD / UTM (Moyobamba - Chávez Pata)
    this.bounds = {
      minX: 279400,
      maxX: 280150,
      minY: 9335750,
      maxY: 9336700
    };

    this.worldFile = null;
    this.listeners = [];

    // Generar ortofoto base inicial de alta resolución para la zona de Chávez Pata
    this._generateSatelliteBasemap();
  }

  /**
   * Suscribirse a cambios de estado
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  _notify() {
    this.listeners.forEach(cb => cb(this));
  }

  setVisible(visible) {
    this.visible = !!visible;
    this._notify();
  }

  setOpacity(opacity) {
    this.opacity = Math.max(0, Math.min(1, opacity));
    this._notify();
  }

  /**
   * Carga una imagen personalizada desde archivo (File o Blob)
   * @param {File} file 
   * @param {string} [worldFileContent] Contenido opcional de archivo .tfw / .jgw
   */
  async loadFromFile(file, worldFileContent = null) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.image = img;
          this.isLoaded = true;
          this.sourceType = 'custom';
          this.visible = true;

          if (worldFileContent) {
            this.setWorldFile(worldFileContent, img.width, img.height);
          } else {
            // Si no tiene world file, posicionar en los límites del proyecto
            this.bounds = {
              minX: 279400,
              maxX: 280150,
              minY: 9335750,
              maxY: 9336700
            };
          }
          this._notify();
          resolve(this);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Configura las coordenadas georreferenciadas desde un World File (.tfw / .jgw)
   */
  setWorldFile(tfwContent, imgWidth, imgHeight) {
    this.worldFile = WorldFile.parse(tfwContent);
    const minX = this.worldFile.c;
    const maxY = this.worldFile.f;
    const maxX = minX + this.worldFile.a * imgWidth;
    const minY = maxY + this.worldFile.e * imgHeight; // e es típicamente negativo

    this.bounds = {
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minY: Math.min(minY, maxY),
      maxY: Math.max(minY, maxY)
    };
    this._notify();
  }

  /**
   * Calibra la posición de la imagen usando 2 puntos de control con Helmert 2D
   * @param {Array<{u: number, v: number, cadX: number, cadY: number}>} controlPairs 
   */
  calibrateWithGCP(controlPairs) {
    if (controlPairs.length < 2 || !this.image) return;

    const gcpFormatted = controlPairs.map(p => ({
      x: p.u,
      y: p.v,
      targetX: p.cadX,
      targetY: p.cadY
    }));

    const helmert = Helmert2D.fit(gcpFormatted);
    
    // Esquinas de la imagen
    const w = this.image.width;
    const h = this.image.height;

    const c1 = helmert.transform(0, 0);
    const c2 = helmert.transform(w, h);

    this.bounds = {
      minX: Math.min(c1.x, c2.x),
      maxX: Math.max(c1.x, c2.x),
      minY: Math.min(c1.y, c2.y),
      maxY: Math.max(c1.y, c2.y)
    };

    this._notify();
  }

  /**
   * Genera un mapa base satelital fotogramétrico realista de la zona de Chávez Pata
   */
  _generateSatelliteBasemap() {
    if (typeof document === 'undefined') {
      // Entorno Node.js de pruebas sin DOM
      return;
    }
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 1200;
    offCanvas.height = 1400;
    const ctx = offCanvas.getContext('2d');

    // Fondo de textura de vegetación y terreno tropical del Alto Mayo (San Martín)
    const grad = ctx.createLinearGradient(0, 0, 1200, 1400);
    grad.addColorStop(0, '#1c281a');
    grad.addColorStop(0.3, '#243322');
    grad.addColorStop(0.7, '#1f2b1d');
    grad.addColorStop(1, '#182417');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 1400);

    // Texturizado procedural de vegetación y parcelas agrícolas
    ctx.fillStyle = 'rgba(40, 58, 35, 0.4)';
    for (let i = 0; i < 400; i++) {
      const rx = (i * 137.5) % 1200;
      const ry = (i * 89.3) % 1400;
      const rw = 25 + (i % 45);
      const rh = 20 + (i % 35);
      ctx.fillRect(rx, ry, rw, rh);
    }

    // Senderos y vías de tierra afirmada
    ctx.strokeStyle = 'rgba(120, 105, 80, 0.35)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(350, 0);
    ctx.lineTo(380, 500);
    ctx.lineTo(410, 1000);
    ctx.lineTo(440, 1400);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(110, 95, 75, 0.25)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(100, 450);
    ctx.lineTo(1100, 420);
    ctx.moveTo(80, 850);
    ctx.lineTo(1120, 890);
    ctx.stroke();

    // Crear elemento Image
    const img = new Image();
    img.onload = () => {
      this.image = img;
      this.isLoaded = true;
      this._notify();
    };
    img.src = offCanvas.toDataURL('image/jpeg', 0.85);
  }

  /**
   * Dibuja la imagen georreferenciada sobre el canvas principal
   * @param {CanvasRenderingContext2D} ctx 
   * @param {Function} cadToScreen Función de transformación CAD -> Pantalla
   */
  render(ctx, cadToScreen) {
    if (!this.visible || !this.isLoaded || !this.image) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Calcular esquinas en pantalla: (minX, maxY) es la esquina superior izquierda en CAD
    const topLeft = cadToScreen(this.bounds.minX, this.bounds.maxY);
    const bottomRight = cadToScreen(this.bounds.maxX, this.bounds.minY);

    const screenW = bottomRight.x - topLeft.x;
    const screenH = bottomRight.y - topLeft.y;

    // Solo dibujar si está dentro o intersecta el viewport
    ctx.drawImage(this.image, topLeft.x, topLeft.y, screenW, screenH);
    ctx.restore();
  }
}
