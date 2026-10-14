/**
 * Módulo para garantizar la preservación inmutable de entidades CAD y trazabilidad de operaciones
 */

/**
 * Clona profundamente una estructura de datos de vértices o coordenadas
 * @template T
 * @param {T} obj 
 * @returns {T}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  const copy = {};
  for (const [key, value] of Object.entries(obj)) {
    copy[key] = deepClone(value);
  }
  return copy;
}

/**
 * Congela profundamente un objeto para evitar cualquier mutación accidental
 * @template T
 * @param {T} obj 
 * @returns {Readonly<T>}
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const prop = obj[key];
    if (prop !== null && typeof prop === 'object' && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  }
  return obj;
}

/**
 * Estructura de registro de operaciones auditables
 */
export class AuditLog {
  constructor() {
    this.entries = [];
  }

  /**
   * Registra una operación sobre una entidad
   * @param {string} entityHandle 
   * @param {string} operation 
   * @param {string} reason 
   * @param {any} details 
   */
  record(entityHandle, operation, reason, details = {}) {
    this.entries.push({
      timestamp: new Date().toISOString(),
      entityHandle,
      operation,
      reason,
      details: deepClone(details)
    });
  }

  getEntries() {
    return [...this.entries];
  }

  clear() {
    this.entries = [];
  }
}

