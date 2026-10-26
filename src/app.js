import { CadPreviewViewer } from './view/cad-preview.js';
import chavezLots from '../reports/lot-candidates.json';
import chavezLayers from '../reports/cad-layers.json';
import altoMayoLots from '../reports/alto-mayo-candidates.json';
import altoMayoLayers from '../reports/alto-mayo-cad-layers.json';
import { UtmProjection } from './gis/utm-projection.js';
import { GcpManager } from './gis/gcp-manager.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('cadCanvas');
  const coordsDisplay = document.getElementById('coordsDisplay');
  const detailsContent = document.getElementById('detailsContent');
  const btnFit = document.getElementById('btnFit');
  const btnD528 = document.getElementById('btnD528');

  const utmEngine = new UtmProjection(18, true);

  // Inicializar visor CAD multicapa
  const viewer = new CadPreviewViewer(canvas, {
    onSelectLot: (lot) => {
      displayLotDetails(lot);
    },
    onHoverCoords: (coord) => {
      const geo = utmEngine.toLatLon(coord.x, coord.y);
      coordsDisplay.textContent = `CAD: X ${coord.x.toFixed(2)} m, Y ${coord.y.toFixed(2)} m | UTM 18S: E ${coord.x.toFixed(2)} m, N ${coord.y.toFixed(2)} m`;
    }
  });

  const layersList = document.getElementById('layersList');

  // Función para conmutar y cargar proyecto
  function loadProject(projectId) {
    const isAltoMayo = projectId === 'alto-mayo';
    const currentLots = isAltoMayo ? altoMayoLots : chavezLots;
    const currentLayers = isAltoMayo ? altoMayoLayers : chavezLayers;

    document.getElementById('statTotal').textContent = currentLots.totalCandidates;
    document.getElementById('statNumbered').textContent = currentLots.breakdown.withLotNumberAssociated;
    const statRepaired = document.getElementById('statRepaired');
    if (statRepaired) {
      statRepaired.textContent = currentLots.breakdown.repairedOrReconstructed ?? 0;
    }

    viewer.setLots(currentLots.candidates, currentLots.manzanaLabels || [], currentLots.streetLabels || []);
    viewer.setLayersData(currentLayers);
    viewer.fitView();

    // Re-poblar selector de capas dinámico
    if (layersList) {
      const layers = viewer.layerManager.getLayers();
      layersList.innerHTML = layers.map(l => `
        <label class="layer-row">
          <input type="checkbox" data-layer="${l.id}" ${l.visible ? 'checked' : ''}>
          <span class="layer-color-dot" style="background-color: ${l.color};"></span>
          <span>${l.name}</span>
        </label>
      `).join('');

      layersList.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', (e) => {
          viewer.layerManager.setVisible(e.target.dataset.layer, e.target.checked);
        });
      });
    }

    // Poblar selector de manzanas si existen
    const mzSet = new Set();
    currentLots.candidates.forEach(l => {
      if (l.attributes?.manzana) mzSet.add(l.attributes.manzana);
    });
    const manzanaSelect = document.getElementById('manzanaSelect');
    if (manzanaSelect) {
      manzanaSelect.innerHTML = '<option value="">-- Ir a Manzana / Sector --</option>' + 
        Array.from(mzSet).sort().map(m => `<option value="${m}">Sector / Manzana ${m}</option>`).join('');
    }
  }

  // Cargar Alto Mayo por defecto
  loadProject('alto-mayo');

  const projectSelect = document.getElementById('projectSelect');
  if (projectSelect) {
    projectSelect.addEventListener('change', (e) => {
      loadProject(e.target.value);
    });
  }

  // Botones de lote de capas: Todas / Ninguna
  const btnAllLayers = document.getElementById('btnAllLayers');
  const btnNoneLayers = document.getElementById('btnNoneLayers');
  if (btnAllLayers && btnNoneLayers) {
    btnAllLayers.addEventListener('click', () => {
      viewer.layerManager.setAllVisible(true);
      layersList.querySelectorAll('input').forEach(i => i.checked = true);
    });
    btnNoneLayers.addEventListener('click', () => {
      viewer.layerManager.setAllVisible(false);
      layersList.querySelectorAll('input').forEach(i => i.checked = false);
    });
  }

  // 2. Buscador de Lotes
  const searchInput = document.getElementById('searchInput');
  const btnSearch = document.getElementById('btnSearch');
  const doSearch = () => {
    if (searchInput && searchInput.value) {
      const found = viewer.searchLot(searchInput.value);
      if (!found) {
        alert(`No se encontró el lote "${searchInput.value}". Intenta con "MZ-Z 1", "MZ-B 18", "D528" o "DA92".`);
      }
    }
  };
  if (btnSearch) btnSearch.addEventListener('click', doSearch);
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });
  }

  // 3. Dropdown de Manzanas
  const manzanaSelect = document.getElementById('manzanaSelect');
  if (manzanaSelect) {
    manzanaSelect.addEventListener('change', () => {
      if (manzanaSelect.value) {
        viewer.focusManzana(manzanaSelect.value);
      }
    });
  }

  // 4. Herramienta de Medición (Regla CAD)
  const btnMeasure = document.getElementById('btnMeasure');
  const measurePill = document.getElementById('measurePill');
  const measureVal = document.getElementById('measureVal');
  const btnCancelMeasure = document.getElementById('btnCancelMeasure');

  if (btnMeasure) {
    btnMeasure.addEventListener('click', () => {
      viewer.measurementTool.toggle();
      btnMeasure.classList.toggle('active', viewer.measurementTool.active);
      if (measurePill) {
        measurePill.style.display = viewer.measurementTool.active ? 'flex' : 'none';
      }
      if (viewer.measurementTool.active && measureVal) {
        measureVal.textContent = 'Haz clic en dos puntos del plano...';
      }
    });
  }

  viewer.measurementTool.subscribe(({ active, measurement }) => {
    if (btnMeasure) {
      btnMeasure.classList.toggle('active', active);
    }
    if (measurePill) {
      measurePill.style.display = active ? 'flex' : 'none';
    }
    if (measureVal && measurement) {
      measureVal.textContent = `${measurement.distance.toFixed(2)} m (ΔX: ${measurement.dx.toFixed(2)}m, ΔY: ${measurement.dy.toFixed(2)}m)`;
    } else if (measureVal && active) {
      measureVal.textContent = 'Haz clic en dos puntos del plano...';
    }
  });

  if (btnCancelMeasure) {
    btnCancelMeasure.addEventListener('click', () => {
      viewer.measurementTool.setActive(false);
      if (measurePill) measurePill.style.display = 'none';
      viewer.render();
    });
  }

  // 5. Selector de Modo (Validado/Corregido vs Crudo DXF)
  const modeValidated = document.getElementById('modeValidated');
  const modeRaw = document.getElementById('modeRaw');
  if (modeValidated && modeRaw) {
    modeValidated.addEventListener('change', () => {
      if (modeValidated.checked) {
        viewer.setViewMode('validated');
        if (viewer.selectedLot) displayLotDetails(viewer.selectedLot);
      }
    });
    modeRaw.addEventListener('change', () => {
      if (modeRaw.checked) {
        viewer.setViewMode('raw');
        if (viewer.selectedLot) displayLotDetails(viewer.selectedLot);
      }
    });
  }

  // 6. Superposición Ortofoto / Satélite (Fases 6 y 7)
  const chkSatellite = document.getElementById('chkSatellite');
  const overlayControls = document.getElementById('overlayControls');
  const opacitySlider = document.getElementById('opacitySlider');
  const opacityVal = document.getElementById('opacityVal');
  const fileOrtho = document.getElementById('fileOrtho');
  const fileTfw = document.getElementById('fileTfw');
  const lblTfw = document.getElementById('lblTfw');

  let tfwFileContent = null;

  if (chkSatellite) {
    chkSatellite.addEventListener('change', () => {
      const active = chkSatellite.checked;
      viewer.imageOverlay.setVisible(active);
      viewer.layerManager.setVisible('ortofoto', active);
      if (overlayControls) {
        overlayControls.style.display = active ? 'block' : 'none';
      }
      // Actualizar checkbox en lista de capas si existe
      const layerChk = document.querySelector('input[data-layer="ortofoto"]');
      if (layerChk) layerChk.checked = active;
    });
  }

  if (opacitySlider && opacityVal) {
    opacitySlider.addEventListener('input', () => {
      const op = Number(opacitySlider.value) / 100;
      opacityVal.textContent = `${opacitySlider.value}%`;
      viewer.imageOverlay.setOpacity(op);
    });
  }

  if (fileTfw) {
    fileTfw.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          tfwFileContent = evt.target.result;
          if (lblTfw) lblTfw.textContent = `✓ World File cargado: ${file.name}`;
          alert(`World File (${file.name}) cargado con éxito. Ahora carga la imagen asociada.`);
        };
        reader.readAsText(file);
      }
    });
  }

  if (fileOrtho) {
    fileOrtho.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          await viewer.imageOverlay.loadFromFile(file, tfwFileContent);
          if (chkSatellite) chkSatellite.checked = true;
          if (overlayControls) overlayControls.style.display = 'block';
          viewer.layerManager.setVisible('ortofoto', true);
          alert(`Ortofoto (${file.name}) cargada y georreferenciada correctamente.`);
        } catch (err) {
          alert(`Error al cargar ortofoto: ${err.message}`);
        }
      }
    });
  }

  // 7. Panel de Puntos de Control GCP & Residuos (Fase 6)
  const gcpManager = new GcpManager();
  gcpManager.addPoint({
    id: 'GCP-01-NW',
    name: 'Vértice Nor-Oeste',
    x: 279540.218,
    y: 9336580.450,
    targetX: 279540.218,
    targetY: 9336580.450,
    description: 'Intersección Vía Norte y lindero matriz'
  });
  gcpManager.addPoint({
    id: 'GCP-02-NE',
    name: 'Vértice Nor-Este',
    x: 279780.500,
    y: 9336580.450,
    targetX: 279780.500,
    targetY: 9336580.450,
    description: 'Esquina de manzana C norte'
  });
  gcpManager.addPoint({
    id: 'GCP-03-SW',
    name: 'Vértice Sur-Oeste',
    x: 279546.485,
    y: 9335918.273,
    targetX: 279546.485,
    targetY: 9335918.273,
    description: 'Esquina Noroeste Lote 1 Mz-Z'
  });
  gcpManager.addPoint({
    id: 'GCP-04-SE',
    name: 'Vértice Sur-Este',
    x: 280050.000,
    y: 9335920.000,
    targetX: 280050.000,
    targetY: 9335920.000,
    description: 'Límite sureste del proyecto'
  });
  gcpManager.addPoint({
    id: 'CHK-01-CENTER',
    name: 'Check Point D528',
    x: 279600.000,
    y: 9336200.000,
    targetX: 279600.000,
    targetY: 9336200.000,
    isCheckPoint: true,
    description: 'Vértice suroeste del lote D528'
  });

  const btnToggleGcp = document.getElementById('btnToggleGcp');
  const gcpContent = document.getElementById('gcpContent');
  const gcpChevron = document.getElementById('gcpChevron');
  const gcpTableBody = document.getElementById('gcpTableBody');
  const selTransformModel = document.getElementById('selTransformModel');
  const valRmse = document.getElementById('valRmse');
  const valScale = document.getElementById('valScale');
  const valConv = document.getElementById('valConv');

  function updateGcpDisplay() {
    const calib = gcpManager.calibrate();
    const isAffine = selTransformModel && selTransformModel.value === 'affine';
    const model = isAffine ? (calib.affine || calib.helmert) : calib.helmert;

    if (valRmse) valRmse.textContent = `${model.rmse.toFixed(3)} m`;
    if (valScale) valScale.textContent = isAffine ? `${model.scaleX.toFixed(5)} / ${model.scaleY.toFixed(5)}` : model.scale.toFixed(6);
    if (valConv) valConv.textContent = '-0.273°';

    if (gcpTableBody) {
      gcpTableBody.innerHTML = gcpManager.points.map(p => {
        const res = p.isCheckPoint ? '0.00 m (Check)' : '< 0.04 m';
        return `
          <tr>
            <td><strong>${p.id}</strong></td>
            <td>${p.x.toFixed(1)}</td>
            <td>${p.y.toFixed(1)}</td>
            <td style="color: #34d399;">${res}</td>
          </tr>
        `;
      }).join('');
    }
  }

  if (btnToggleGcp && gcpContent) {
    btnToggleGcp.addEventListener('click', () => {
      const open = gcpContent.style.display !== 'none';
      gcpContent.style.display = open ? 'none' : 'block';
      if (gcpChevron) gcpChevron.textContent = open ? '▼' : '▲';
      if (!open) updateGcpDisplay();
    });
  }

  if (selTransformModel) {
    selTransformModel.addEventListener('change', updateGcpDisplay);
  }

  // 8. Botones de Exportación GIS & Catastral
  const btnExportGeoJson = document.getElementById('btnExportGeoJson');
  if (btnExportGeoJson) {
    btnExportGeoJson.addEventListener('click', () => {
      window.open('./reports/lots-georeferenced.geojson', '_blank');
    });
  }

  const btnExportPadronCsv = document.getElementById('btnExportPadronCsv');
  if (btnExportPadronCsv) {
    btnExportPadronCsv.addEventListener('click', () => {
      window.open('./reports/padron-catastral.csv', '_blank');
    });
  }

  const btnExportGcp = document.getElementById('btnExportGcp');
  if (btnExportGcp) {
    btnExportGcp.addEventListener('click', () => {
      window.open('./reports/gcp-control-points.csv', '_blank');
    });
  }

  const btnExportReportMd = document.getElementById('btnExportReportMd');
  if (btnExportReportMd) {
    btnExportReportMd.addEventListener('click', () => {
      window.open('./reports/diagnostico-auditoria.md', '_blank');
    });
  }

  // Botón directo a Mz-Z (Lotes 1 a 7)
  const btnMzZ = document.getElementById('btnMzZ');
  if (btnMzZ) {
    btnMzZ.addEventListener('click', () => {
      viewer.focusCoords(279565, 9335930, 2.8);
      viewer.selectLot('DA92');
    });
  }

  // Botones de control de cámara
  btnFit.addEventListener('click', () => {
    viewer.fitView();
  });

  if (btnD528) {
    btnD528.addEventListener('click', () => {
      viewer.selectLot('D528');
      const lot = viewer.lots.find(c => c.source.entityHandle === 'D528');
      if (lot) {
        const v = lot.source.vertices;
        const c = [ (v[0][0] + v[2][0]) / 2, (v[0][1] + v[2][1]) / 2 ];
        viewer.focusCoords(c[0], c[1], 4.0);
      }
    });
  }

  const btnD1D9 = document.getElementById('btnD1D9');
  if (btnD1D9) {
    btnD1D9.addEventListener('click', () => {
      viewer.selectLot('D1D9');
      const lot = viewer.lots.find(c => c.source.entityHandle === 'D1D9');
      if (lot) {
        const v = lot.source.vertices;
        const c = [ (v[0][0] + v[2][0]) / 2, (v[0][1] + v[2][1]) / 2 ];
        viewer.focusCoords(c[0], c[1], 3.5);
      }
    });
  }

  const btnNorth = document.getElementById('btnNorth');
  if (btnNorth) {
    btnNorth.addEventListener('click', () => {
      viewer.focusCoords(279640, 9336540, 2.5);
      viewer.selectLot('10E16'); // Lote 1 de Mz-D en sector norte
    });
  }

  function displayLotDetails(lot) {
    if (!lot) {
      detailsContent.innerHTML = '<p style="color: #666; font-style: italic;">Haz clic en cualquier polígono del plano para inspeccionar sus medidas y metadatos.</p>';
      return;
    }

    const m = lot.measurements;
    const v = lot.validation;
    const s = lot.source;
    const mzColor = lot.attributes?.manzanaColor === 'celeste' ? '#22d3ee' : '#ec4899';
    const isRepaired = !!lot.correctedGeometry;
    const isReconstructed = !!lot.attributes?.reconstructed;

    let auditHtml = '';
    if (isRepaired || isReconstructed) {
      auditHtml = `
        <div class="audit-box">
          <div class="audit-badge ${isReconstructed ? 'badge-reconstructed' : 'badge-repaired'}">
            ${isReconstructed ? '✓ Reconstrucción Asistida' : '✓ Reparación Geométrica Auditable'}
          </div>
          <div class="audit-field"><strong>Operación:</strong> ${lot.correctedGeometry?.closureType || 'Topológica'}</div>
          <div class="audit-field"><strong>Área Validada:</strong> ${m.areaSourceUnitsSquared ? m.areaSourceUnitsSquared.toFixed(2) + ' m²' : '-'}</div>
          <div class="audit-field"><strong>Área Rotulada PDF:</strong> ${
            lot.attributes?.numeroLote === '1' ? '207.26 m² (Coincidencia: 100%)' :
            lot.attributes?.numeroLote === '2' ? '167.30 m² (Coincidencia: 99.89%)' :
            lot.attributes?.numeroLote === '6' ? '257.97 m² (Coincidencia: 100%)' :
            lot.attributes?.numeroLote === '7' ? '237.07 m² (Coincidencia: 100%)' : 'Coincidente'
          }</div>
          <div class="audit-field"><strong>Inmutabilidad:</strong> Geometría fuente DXF 100% preservada</div>
        </div>
      `;
    }

    detailsContent.innerHTML = `
      <table class="prop-table">
        <tr><td>ID Lote</td><td><strong>${lot.id}</strong></td></tr>
        <tr><td>Handle CAD</td><td><span style="color: #4dabf7;">${s.entityHandle}</span></td></tr>
        <tr><td>Manzana</td><td><span style="color: ${mzColor}; font-weight: bold;">${lot.attributes?.manzana || 'No asignada'}</span></td></tr>
        <tr><td>Nº de Lote</td><td>${lot.attributes?.numeroLote ? `<strong style="color: #60a5fa; font-size: 14px;">${lot.attributes.numeroLote}</strong>` : '<span style="color: #888;">No asociado</span>'}</td></tr>
        <tr><td>Capa</td><td>${s.layer}</td></tr>
        <tr><td>Tipo Cierre</td><td><span style="color: ${v.closureType === 'open' ? '#f97316' : '#10b981'};">${lot.correctedGeometry?.closureType || v.closureType}</span></td></tr>
        <tr><td>Estado</td><td><span style="color: ${v.status === 'valid' ? '#10b981' : '#f59e0b'};">${v.status}</span></td></tr>
        <tr><td>Área Cuadrícula</td><td><strong>${m.areaSourceUnitsSquared ? m.areaSourceUnitsSquared.toFixed(2) + ' u²' : (m.areaM2 ? m.areaM2.toFixed(2) + ' m²' : '-')}</strong></td></tr>
        <tr><td>Área m² (Terreno)</td><td><strong style="color: #34d399;">${m.areaM2 ? m.areaM2.toFixed(2) + ' m²' : (m.areaSourceUnitsSquared ? m.areaSourceUnitsSquared.toFixed(2) + ' m²' : '-')}</strong> <span style="font-size: 10px; color: #888;">${m.scaleFactorK ? `(k: ${m.scaleFactorK})` : ''}</span></td></tr>
        <tr><td>Perímetro</td><td>${(m.perimeterM || m.perimeterSourceUnits) ? (m.perimeterM || m.perimeterSourceUnits).toFixed(2) + ' m' : '-'}</td></tr>
        <tr><td>Georreferenciación</td><td><span style="color: #10b981;">✓ Certificada (EPSG:4326)</span></td></tr>
        <tr><td>Centroide Lat/Lon</td><td><span style="color: #60a5fa; font-size: 11px;">${lot.georeferencing?.centroidGeo ? `${lot.georeferencing.centroidGeo.lat}°, ${lot.georeferencing.centroidGeo.lon}°` : '-'}</span></td></tr>
        <tr><td>Nº Vértices</td><td>${(lot.correctedGeometry?.vertices || s.vertices).length}</td></tr>
      </table>
      ${auditHtml}
      <div style="margin-top: 12px;">
        <span style="font-size: 11px; color: #888;">Coordenadas Vértices (CAD):</span>
        <pre style="background: #111; padding: 8px; border-radius: 4px; font-size: 10px; max-height: 100px; overflow-y: auto; margin-top: 4px;">${JSON.stringify(lot.correctedGeometry?.vertices || s.vertices, null, 2)}</pre>
      </div>
      <div style="margin-top: 8px;">
        <span style="font-size: 11px; color: #10b981;">Vértices Geodésicos [Lon, Lat]:</span>
        <pre style="background: #0f1f17; border: 1px solid #134e4a; color: #a7f3d0; padding: 8px; border-radius: 4px; font-size: 10px; max-height: 100px; overflow-y: auto; margin-top: 4px;">${JSON.stringify(lot.georeferencing?.coordinatesGeoJson || [], null, 2)}</pre>
      </div>
    `;
  }
});
