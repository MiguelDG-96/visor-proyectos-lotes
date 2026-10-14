/**
 * Utilidades para formateo de números, coordenadas y cadenas
 */

/**
 * Formatea un número decimal con número fijo de decimales
 * @param {number} value 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return Number(value).toFixed(decimals);
}

/**
 * Formatea coordenadas [x, y]
 * @param {number[]} pt 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatCoord(pt, decimals = 4) {
  if (!Array.isArray(pt) || pt.length < 2) return '-';
  return `(${formatNumber(pt[0], decimals)}, ${formatNumber(pt[1], decimals)})`;
}

/**
 * Convierte color ACI (AutoCAD Color Index) o número RGB a código hexadecimal
 * @param {number} colorNumber 
 * @returns {string}
 */
export function aciToHex(colorNumber) {
  if (colorNumber === null || colorNumber === undefined) return '#000000';
  
  // Tabla estándar ACI 1-7
  const aciStandard = {
    1: '#FF0000', // Rojo
    2: '#FFFF00', // Amarillo
    3: '#00FF00', // Verde
    4: '#00FFFF', // Cian
    5: '#0000FF', // Azul
    6: '#FF00FF', // Magenta
    7: '#FFFFFF', // Blanco/Negro
    8: '#808080',
    9: '#C0C0C0'
  };

  if (aciStandard[colorNumber]) {
    return aciStandard[colorNumber];
  }

  // Si viene como entero de 24 bits (ej. de dxf-parser)
  if (colorNumber > 256) {
    const hex = colorNumber.toString(16).padStart(6, '0');
    return `#${hex}`;
  }

  return '#888888';
}

