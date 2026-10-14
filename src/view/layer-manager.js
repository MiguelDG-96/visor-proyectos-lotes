/**
 * Gestor de capas para el visor CAD interactivo (Fase 4)
 * Permite activar/desactivar y configurar estilos por capa y categoría
 */

export class LayerManager {
  constructor(initialConfig = {}) {
    this.layers = {
      perimetro: {
        id: 'perimetro',
        name: 'Perímetro Proyecto',
        category: 'perimetro',
        visible: true,
        color: '#f43f5e',
        lineWidth: 2.5,
        description: 'Linderos del predio matriz y predios rurales'
      },
      vias: {
        id: 'vias',
        name: 'Vías y Calles (Líneas)',
        category: 'calles',
        visible: true,
        color: '#64748b',
        lineWidth: 1.2,
        description: 'Ejes y bordes de calzadas'
      },
      streetLabels: {
        id: 'streetLabels',
        name: 'Nombres de Calles',
        category: 'calles',
        visible: true,
        color: '#cbd5e1',
        description: 'Rótulos de calles, pasajes y avenidas'
      },
      manzanaContornos: {
        id: 'manzanaContornos',
        name: 'Contornos de Manzana',
        category: 'manzanas',
        visible: false,
        color: '#a855f7',
        lineWidth: 1.5,
        description: 'Polilíneas perimetrales de manzana'
      },
      manzanaLabels: {
        id: 'manzanaLabels',
        name: 'Rótulos de Manzana',
        category: 'manzanas',
        visible: true,
        color: '#ec4899',
        description: 'Rótulos Mz-A a Mz-Z'
      },
      lotes: {
        id: 'lotes',
        name: 'Lotes (Polígonos)',
        category: 'lotes',
        visible: true,
        color: '#3b82f6',
        fillOpacity: 0.15,
        lineWidth: 1.0,
        description: 'Polígonos residenciales de la capa LOTES'
      },
      circulos: {
        id: 'circulos',
        name: 'Círculos de Lote',
        category: 'circulos',
        visible: true,
        color: 'rgba(255, 255, 255, 0.45)',
        lineWidth: 1.0,
        description: 'Círculos que enmarcan la numeración'
      },
      numerosLote: {
        id: 'numerosLote',
        name: 'Números de Lote',
        category: 'textos',
        visible: true,
        color: '#93c5fd',
        description: 'Textos de numeración por lote'
      },
      cotas: {
        id: 'cotas',
        name: 'Cotas y Medidas',
        category: 'cotas',
        visible: false,
        color: '#fbbf24',
        description: 'Dimensiones lineales y áreas rotuladas'
      }
    };

    // Aplicar configuraciones iniciales personalizadas
    for (const [key, val] of Object.entries(initialConfig)) {
      if (this.layers[key]) {
        Object.assign(this.layers[key], val);
      }
    }

    this.listeners = new Set();
  }

  /**
   * Obtiene la lista de capas disponibles
   * @returns {Object[]}
   */
  getLayers() {
    return Object.values(this.layers);
  }

  /**
   * Consulta si una capa está visible
   * @param {string} layerId 
   * @returns {boolean}
   */
  isVisible(layerId) {
    return !!this.layers[layerId]?.visible;
  }

  /**
   * Establece la visibilidad de una capa
   * @param {string} layerId 
   * @param {boolean} visible 
   */
  setVisible(layerId, visible) {
    if (this.layers[layerId] && this.layers[layerId].visible !== visible) {
      this.layers[layerId].visible = !!visible;
      this._notify();
    }
  }

  /**
   * Alterna la visibilidad de una capa
   * @param {string} layerId 
   */
  toggleLayer(layerId) {
    if (this.layers[layerId]) {
      this.setVisible(layerId, !this.layers[layerId].visible);
    }
  }

  /**
   * Activa o desactiva todas las capas
   * @param {boolean} visible 
   */
  setAllVisible(visible) {
    for (const layer of Object.values(this.layers)) {
      layer.visible = !!visible;
    }
    this._notify();
  }

  /**
   * Suscribe un callback a cambios de capa
   * @param {Function} callback 
   * @returns {Function} Función para cancelar suscripción
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.layers);
      } catch (err) {
        console.error('Error en listener de LayerManager:', err);
      }
    }
  }
}

