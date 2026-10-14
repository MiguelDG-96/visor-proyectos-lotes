/**
 * Utilidades para generación y normalización de identificadores estables
 */

let counter = 0;

/**
 * Genera un identificador único con prefijo
 * @param {string} prefix 
 * @returns {string}
 */
export function generateId(prefix = 'ent') {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

/**
 * Normaliza un handle CAD hexadecimal
 * @param {string|number} handle 
 * @returns {string}
 */
export function normalizeHandle(handle) {
  if (handle === null || handle === undefined) return '';
  return String(handle).trim().toUpperCase();
}

/**
 * Construye un ID de lote estable vinculado a su handle CAD
 * @param {string} handle 
 * @param {string|null} mz 
 * @param {string|null} lt 
 * @returns {string}
 */
export function buildLotId(handle, mz = null, lt = null) {
  const normHandle = normalizeHandle(handle);
  if (mz && lt) {
    return `LOT-${mz}-${lt}-${normHandle}`;
  }
  return `LOT-${normHandle || generateId('lot')}`;
}

