import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LayerManager } from '../src/view/layer-manager.js';
import { MeasurementTool } from '../src/view/measurement-tool.js';

describe('LayerManager & Multi-Layer System Tests (Fase 4)', () => {
  test('Inicializa con las capas predeterminadas del proyecto activas', () => {
    const lm = new LayerManager();
    const layers = lm.getLayers();

    assert.ok(layers.length >= 8, 'Debe incluir todas las capas clave');
    assert.equal(lm.isVisible('perimetro'), true);
    assert.equal(lm.isVisible('lotes'), true);
    assert.equal(lm.isVisible('vias'), true);
    assert.equal(lm.isVisible('numerosLote'), true);
    assert.equal(lm.isVisible('circulos'), true);
    assert.equal(lm.isVisible('cotas'), false, 'Cotas inicia apagada para rendimiento inicial');
  });

  test('Alterna visibilidad de capa y notifica a los suscriptores', () => {
    const lm = new LayerManager();
    let notified = false;

    lm.subscribe((layers) => {
      notified = true;
      assert.equal(layers.cotas.visible, true);
    });

    lm.toggleLayer('cotas');
    assert.equal(lm.isVisible('cotas'), true);
    assert.equal(notified, true);
  });

  test('Activa y desactiva todas las capas en bloque', () => {
    const lm = new LayerManager();
    lm.setAllVisible(false);
    assert.equal(lm.isVisible('lotes'), false);
    assert.equal(lm.isVisible('vias'), false);

    lm.setAllVisible(true);
    assert.equal(lm.isVisible('lotes'), true);
    assert.equal(lm.isVisible('vias'), true);
  });
});

describe('MeasurementTool Interactive Distance Tests (Fase 4)', () => {
  test('Calcula distancia euclidiana exacta en metros CAD', () => {
    const tool = new MeasurementTool();
    tool.setActive(true);

    // Medición de prueba: frente del Lote D528 (8.00 metros de ancho)
    tool.addPoint({ x: 279600.0, y: 9336200.0 });
    tool.addPoint({ x: 279608.0, y: 9336200.0 });

    const m = tool.getMeasurement();
    assert.ok(m, 'Debe retornar resultado de medición');
    assert.equal(m.fixed, true);
    assert.equal(m.distance, 8.0);
    assert.equal(m.dx, 8.0);
    assert.equal(m.dy, 0.0);
  });

  test('Calcula distancia diagonal euclidiana precisa con teorema de Pitágoras', () => {
    const tool = new MeasurementTool();
    tool.setActive(true);

    // Triángulo 3 - 4 - 5
    tool.addPoint({ x: 0, y: 0 });
    tool.addPoint({ x: 3, y: 4 });

    const m = tool.getMeasurement();
    assert.equal(m.distance, 5.0);
  });

  test('Limpia la medición y notifica estado inactivo', () => {
    const tool = new MeasurementTool();
    tool.setActive(true);
    tool.addPoint({ x: 10, y: 10 });

    tool.clear();
    assert.equal(tool.getMeasurement(), null);
    assert.equal(tool.points.length, 0);
  });
});

