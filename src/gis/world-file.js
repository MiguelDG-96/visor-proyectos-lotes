/**
 * Lector y generador de archivos de calibración espacial World File (.tfw, .pgw, .jgw, .wld)
 * Utilizado para georreferenciar imágenes de dron, ortofotos y mosaicos satelitales
 */

export class WorldFile {
  /**
   * @param {Object} params
   * @param {number} params.a Tamaño de píxel en dirección X (resolución este-oeste)
   * @param {number} [params.d=0] Término de rotación / cizalla
   * @param {number} [params.b=0] Término de rotación / cizalla
   * @param {number} params.e Tamaño de píxel en dirección Y (negativo, norte-sur)
   * @param {number} params.c Coordenada X del centro del píxel superior izquierdo
   * @param {number} params.f Coordenada Y del centro del píxel superior izquierdo
   */
  constructor({ a, d = 0, b = 0, e, c, f }) {
    this.a = Number(a);
    this.d = Number(d);
    this.b = Number(b);
    this.e = Number(e);
    this.c = Number(c);
    this.f = Number(f);
  }

  /**
   * Parsea el contenido de texto de un World File de 6 líneas
   * @param {string} textContent 
   * @returns {WorldFile}
   */
  static parse(textContent) {
    if (!textContent) throw new Error('Contenido de World File vacío');
    const lines = textContent
      .trim()
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length < 6) {
      throw new Error(`Un World File válido requiere 6 líneas numéricas (encontradas: ${lines.length})`);
    }

    return new WorldFile({
      a: parseFloat(lines[0]),
      d: parseFloat(lines[1]),
      b: parseFloat(lines[2]),
      e: parseFloat(lines[3]),
      c: parseFloat(lines[4]),
      f: parseFloat(lines[5])
    });
  }

  /**
   * Transforma coordenadas de píxel de la imagen (u, v) a coordenadas de terreno (X, Y)
   * @param {number} u Columna de píxel (0 = borde izquierdo)
   * @param {number} v Fila de píxel (0 = borde superior)
   * @returns {{x: number, y: number}}
   */
  pixelToWorld(u, v) {
    return {
      x: this.a * u + this.b * v + this.c,
      y: this.d * u + this.e * v + this.f
    };
  }

  /**
   * Transforma coordenadas de terreno (X, Y) a coordenadas de píxel de la imagen (u, v)
   * @param {number} x Coordenada X terreno
   * @param {number} y Coordenada Y terreno
   * @returns {{u: number, v: number}}
   */
  worldToPixel(x, y) {
    // Matriz de inversión 2x2
    const det = this.a * this.e - this.b * this.d;
    if (Math.abs(det) < 1e-15) {
      throw new Error('World File singular. No se puede calcular transformación inversa.');
    }

    const dx = x - this.c;
    const dy = y - this.f;

    const u = (this.e * dx - this.b * dy) / det;
    const v = (-this.d * dx + this.a * dy) / det;

    return { u, v };
  }

  /**
   * Genera el texto estándar de 6 líneas de un World File
   * @returns {string}
   */
  toString() {
    return [
      this.a.toFixed(10),
      this.d.toFixed(10),
      this.b.toFixed(10),
      this.e.toFixed(10),
      this.c.toFixed(6),
      this.f.toFixed(6)
    ].join('\n') + '\n';
  }

  /**
   * Calcula el Ground Sample Distance (GSD) o tamaño medio de píxel en centímetros
   * @returns {number} GSD en cm/píxel
   */
  getGsdCm() {
    const gsdX = Math.hypot(this.a, this.d);
    const gsdY = Math.hypot(this.b, this.e);
    return ((gsdX + gsdY) / 2) * 100;
  }
}
