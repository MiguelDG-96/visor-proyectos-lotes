# DXF CAD & Lot Overlay Lab

Laboratorio independiente en JavaScript puro para **inspeccionar y conservar toda la información útil de un archivo CAD/DXF, identificar y estructurar los polígonos de lotes y otros elementos del plano, y superponerlos sobre imágenes de dron, ortofotos e imágenes satelitales** mediante coordenadas geográficas y puntos de control.

> **Objetivo principal:** construir un inventario estructurado del DXF y conservar las entidades y sus metadatos; identificar los lotes sin perder el resto del plano; validar las geometrías; y georreferenciar las capas para superponerlas sobre una imagen de fondo sin deformaciones arbitrarias. El visor debe permitir activar y desactivar por separado lotes, calles, manzanas, parques, límites, textos, dimensiones y otras entidades que realmente existan en el archivo.

**No se debe descartar información CAD solo porque no sea un polígono de lote.** La extracción de lotes es una función principal, pero el inventario y la conservación de las demás entidades también son requisitos. Este laboratorio se desarrolla primero sin Angular. Solo después de validar el lector, el modelo CAD, las geometrías y la georreferenciación se integrará el núcleo en la aplicación Angular.

---

## 1. Contexto del proyecto y archivos de referencia

Archivo DXF de referencia:

- `03- LOTIZACION UNIFICADO.dxf`

PDF de referencia:

- `03- LOTIZACION UNIFICADO-Layout1.pdf`

En Autodesk Viewer se observaron estas categorías de entidades del dibujo:

- `Blocks`: 12
- `Lines`: 1,233
- `Polylines`: 1,024
- `Circles`: 635
- `Arcs`: 41

Los contadores del visor pueden presentar dos números (por ejemplo, `Polylines (1024) (1023)`). No codificar estas cantidades en el programa: deben leerse del archivo y reportarse en cada importación.

Se seleccionó una entidad identificada como `Polyline [D528]`, con capa `LOTES`. Autodesk Viewer mostró aproximadamente:

- Área: `200.00000000141642`
- Longitud: `66.00000000004381"` (el visor presenta el símbolo de pulgadas)

En el PDF se observan áreas rotuladas en metros cuadrados, por ejemplo `A=200.00m2`, `A=160.00m2` y otras áreas irregulares.

**No se debe concluir que las unidades internas del DXF son metros o pulgadas basándose solo en esas observaciones.** El PDF muestra las unidades de las etiquetas, mientras que las unidades y el sistema de coordenadas efectivos del DXF deben investigarse por separado. La discrepancia debe registrarse y resolverse con comprobaciones geométricas antes de convertir medidas.

### Regla de alcance

El objetivo no es convertir cada entidad en un lote. Los polígonos de lotes se extraen como una categoría específica, pero **calles, parques, manzanas, límites del proyecto, círculos, textos, bloques, arcos, líneas auxiliares, cotas y demás entidades deben conservarse en el inventario CAD** cuando estén presentes. Cada entidad debe mantener su tipo, capa, identificador/handle y geometría o propiedades disponibles. Solo se excluirán de una exportación concreta cuando el usuario elija una exportación filtrada; no se eliminarán del modelo de origen.

---

## 2. Objetivos funcionales

La aplicación debe permitir:

1. Cargar un DXF local.
2. Inspeccionar las capas y los tipos de entidades.
3. Crear un inventario completo de entidades CAD y conservar sus metadatos disponibles.
4. Extraer polilíneas candidatas a lote, priorizando la capa `LOTES`.
5. Preservar coordenadas originales, identificadores de entidad y metadatos disponibles para todas las entidades, no solo lotes.
6. Validar geometrías de lotes y clasificar las demás entidades sin descartarlas.
7. Mostrar capas completas o categorías filtradas en un visor 2D.
8. Exportar inventario CAD, geometrías, atributos y diagnósticos a JSON.
9. Cargar una ortofoto/mosaico de dron o una imagen satelital como fondo.
10. Georreferenciar el dibujo mediante coordenadas conocidas y puntos de control comunes.
11. Calcular y mostrar errores residuales y advertencias de precisión.
12. Mostrar la superposición sin modificar la geometría CAD original.
13. Exportar lotes y otras capas georreferenciadas a GeoJSON solo cuando su sistema de coordenadas esté definido.
14. Dejar preparada la arquitectura para una futura integración en Angular.

### Fuera del alcance inicial

- Editar o sobrescribir el DXF original.
- Corregir automáticamente todas las entidades.
- Suponer que todas las polilíneas de `LOTES` son lotes válidos.
- Convertir automáticamente cualquier valor de área a m² sin confirmar unidades.
- Georreferenciar de forma fiable una fotografía aérea individual solo con un punto GPS.
- Deformar polígonos para que visualmente encajen en una imagen.
- Integrarse inmediatamente con Angular o con un backend.
- Descargar, extraer o copiar imágenes de plataformas satelitales que no permitan legalmente ese uso.

---

## 3. Stack técnico propuesto

- JavaScript moderno con ES Modules.
- HTML5 y CSS3.
- Vite como servidor de desarrollo.
- SVG para la primera visualización de los polígonos CAD.
- Una librería DXF, por ejemplo `dxf-parser`, con versión fijada en `package.json`.
- Node.js y `node:test` + `node:assert/strict` para pruebas.
- OpenLayers recomendado para el visor geográfico y los sistemas de coordenadas; Leaflet es una alternativa si se justifica.
- Una librería geométrica mantenida para validaciones complejas, seleccionada tras revisar compatibilidad y licencia.
- GeoJSON como formato de intercambio geográfico, con CRS explícito y documentado en la aplicación.

No mezclar la lógica geométrica con el DOM. La librería DXF interpreta el archivo; los módulos propios clasifican, validan y conservan geometrías. La interfaz presenta resultados, pero no decide silenciosamente si una entidad es un lote.

---

## 4. Estructura de carpetas obligatoria

```text
dxf-lot-overlay/
├── index.html
├── package.json
├── README.md
├── .gitignore
├── public/
│   └── samples/
│       └── README.md
├── css/
│   └── styles.css
├── src/
│   ├── app.js
│   ├── state.js
│   ├── config/
│   │   └── layers.config.js
│   ├── dxf/
│   │   ├── dxf-reader.js
│   │   ├── entity-inventory.js
│   │   ├── entity-classifier.js
│   │   ├── layer-inspector.js
│   │   ├── block-inspector.js
│   │   └── lot-extractor.js
│   ├── cad-model/
│   │   ├── cad-document.js
│   │   ├── cad-entity.js
│   │   ├── cad-layer.js
│   │   ├── cad-attributes.js
│   │   └── entity-preservation.js
│   ├── geometry/
│   │   ├── coordinates.js
│   │   ├── tolerance.js
│   │   ├── polygon.js
│   │   ├── intersections.js
│   │   ├── measurements.js
│   │   └── geometry-report.js
│   ├── validation/
│   │   ├── validate-entity.js
│   │   ├── validate-polygon.js
│   │   └── issue-codes.js
│   ├── georeferencing/
│   │   ├── control-points.js
│   │   ├── coordinate-systems.js
│   │   ├── transformations.js
│   │   ├── transform-fit.js
│   │   └── accuracy-report.js
│   ├── imagery/
│   │   ├── image-loader.js
│   │   ├── image-metadata.js
│   │   └── image-georeferencing.js
│   ├── view/
│   │   ├── cad-preview.js
│   │   ├── map-viewer.js
│   │   ├── polygon-renderer.js
│   │   ├── viewport.js
│   │   └── diagnostics-panel.js
│   ├── export/
│   │   ├── export-cad-inventory-json.js
│   │   ├── export-lots-json.js
│   │   ├── export-geojson.js
│   │   └── export-report.js
│   └── utils/
│       ├── ids.js
│       └── format.js
├── tests/
│   ├── dxf-reader.test.js
│   ├── lot-extractor.test.js
│   ├── geometry.test.js
│   ├── validation.test.js
│   ├── transformations.test.js
│   ├── geojson-export.test.js
│   └── fixtures/
│       ├── valid-closed-polyline.dxf
│       ├── open-polyline.dxf
│       ├── repeated-first-last-point.dxf
│       ├── two-vertex-polyline.dxf
│       ├── self-intersecting-polygon.dxf
│       └── sample-lot-plan.dxf
└── reports/
    └── .gitkeep
```

No guardar datos sensibles del usuario en `public/samples/` ni versionar planos privados. Los archivos reales de prueba deben mantenerse localmente o en una ubicación privada acordada.

---

## 5. Responsabilidad de los módulos

### `dxf-reader.js` y `entity-inventory.js`

- Leer el archivo DXF y llamar al parser.
- Construir un inventario completo de entidades, sin limitarse a las polilíneas de lotes.
- Capturar errores de lectura o parseo con mensajes útiles.
- Conservar la entidad original o una referencia suficiente para rastrear sus propiedades.
- Registrar todas las capas y los tipos de entidad que el parser consiga leer.
- Leer, cuando el parser lo permita, versión DXF, variables de unidades, bloques, capas, identificadores y vértices.
- No convertir coordenadas ni decidir qué entidades son lotes.

### `entity-classifier.js`, `layer-inspector.js` y `block-inspector.js`

- Generar un inventario de tipos y capas.
- Distinguir `LWPOLYLINE`, `POLYLINE`, `LINE`, `CIRCLE`, `ARC`, `INSERT`/bloques y textos.
- Mostrar la cantidad real por capa y tipo.
- No asumir que una entidad es lote únicamente por el color o por su apariencia en el visor.
- Clasificar, cuando sea posible, elementos como lotes, calles, parques/áreas verdes, manzanas, perímetro del proyecto, textos, cotas, bloques, círculos y geometría auxiliar. La clasificación debe incluir el nivel de confianza y la regla aplicada; no inventar semántica si la capa o entidad no lo demuestra.
- Inspeccionar bloques e INSERT para evitar perder entidades contenidas dentro de ellos. Mantener la definición del bloque y sus referencias, así como la transformación de cada inserción cuando el parser la exponga.

### `lot-extractor.js`

- Usar `LOTES` como capa candidata principal, respetando mayúsculas/minúsculas según corresponda.
- Permitir configurar nombres alternativos de capa, pero no aplicar reglas amplias sin mostrar qué regla seleccionó cada entidad.
- Extraer únicamente polilíneas candidatas a lote.
- Registrar handle/ID, capa, tipo de entidad y motivo de inclusión.
- Si una entidad potencialmente relevante está en un bloque, marcarla para investigación; no expandir bloques de forma incorrecta ni ignorarlos silenciosamente.

### `polygon.js`, `intersections.js` y `validate-polygon.js`

- Mantener un modelo de polígono independiente de la interfaz.
- Validar vértices, cierre, área degenerada, segmentos duplicados y autointersecciones.
- Detectar coincidencia entre primer y último vértice con una tolerancia documentada.
- Nunca reparar automáticamente una geometría sin guardar la original y dejar registro de la operación.

### `transformations.js` y `transform-fit.js`

- Recibir puntos de control que relacionen coordenadas CAD con coordenadas destino.
- Ofrecer inicialmente transformación de similitud 2D (traslación, rotación y escala uniforme).
- Permitir transformación afín 2D cuando esté justificada por los datos y aprobada por el usuario.
- No aplicar transformación proyectiva, deformación local o rubber-sheeting de forma predeterminada.
- Calcular residuos por punto, error RMS y máximos, e identificar puntos sospechosos.
- Separar puntos usados para ajustar la transformación de puntos independientes usados para validarla.

### `image-georeferencing.js`

- Determinar si el fondo es una imagen georreferenciada, una ortofoto, un mosaico o una imagen simple.
- Leer metadatos y archivos auxiliares disponibles cuando sea posible.
- Si es una imagen sin coordenadas, permitir definir puntos de control manualmente.
- Advertir que una fotografía aérea individual puede contener perspectiva y distorsión y no equivale necesariamente a una ortofoto.

### `polygon-renderer.js` y `map-viewer.js`

- Dibujar los polígonos sobre la imagen en una capa separada.
- Permitir transparencia, color de contorno, grosor y selección de lotes.
- Permitir activar/desactivar la imagen y los polígonos.
- No mutar la geometría fuente al hacer zoom, pan o cambiar estilo.
- Mostrar el estado de georreferenciación y la precisión estimada.

---

## 6. Modelo CAD completo y categorías del plano

El sistema debe conservar dos vistas complementarias del mismo documento:

1. **Modelo CAD fuente:** inventario de todas las entidades y metadatos disponibles, preservados sin modificaciones.
2. **Capas de trabajo:** interpretaciones derivadas para visualizar y consultar lotes, calles, parques, manzanas, perímetros, textos, dimensiones y otros elementos.

Las capas de trabajo nunca reemplazan al modelo fuente.

### Datos a conservar por entidad, cuando existan

- Archivo de origen y versión DXF.
- Handle/identificador, tipo de entidad y nombre de capa.
- Coordenadas CAD originales y elevación cuando exista.
- Estado de cierre y vértices de polilíneas.
- Parámetros de círculos y arcos: centro, radio, ángulos y demás datos disponibles.
- Geometría y transformación de bloques/INSERT.
- Contenido, estilo, posición, rotación y altura de textos.
- Datos de cotas y medidas si el parser los proporciona.
- Color, tipo de línea, grosor, escala de línea y propiedades heredadas de capa.
- Atributos de bloque y metadatos expuestos por el parser.
- Advertencias sobre propiedades que no se pudieron interpretar o conservar.

No todos los parsers leen todas las propiedades de todos los tipos de entidad. Documentar explícitamente cualquier limitación y, si es necesario, ampliar o sustituir el parser antes de afirmar que se conserva el 100 % de los datos CAD.

### Capas y elementos interpretados

La aplicación debe permitir crear filtros de visualización, sin destruir ni reescribir el origen:

- **Lotes:** polígonos individuales, IDs/handles, manzana si se puede determinar, medidas calculadas y atributos que se vinculen con certeza.
- **Calles y vías:** ejes, bordes o contornos disponibles; nombres de calle si aparecen como texto; longitudes solo si la geometría y unidades lo permiten.
- **Parques y áreas verdes:** polígonos o entidades candidatas, distinguidas de lotes y de espacios vacíos.
- **Manzanas:** contornos y rótulos si están representados en el DXF.
- **Límite del proyecto/terreno:** geometría perimetral candidata, diferenciada de las manzanas.
- **Textos y numeración:** nombres de manzana, números de lote, áreas rotuladas y nombres de vías.
- **Cotas y medidas:** conservar texto y entidad de cota cuando sea posible; distinguir la medida rotulada de la calculada.
- **Entidades auxiliares:** círculos, puntos, líneas, arcos, bloques y cualquier otra entidad presente.

Una clasificación puede quedar como `unknown` o `needs-review`. No convertir un contorno en parque o calle solo por su forma.

### Vínculo entre lote y atributos

Cada lote puede almacenar atributos derivados cuando exista evidencia suficiente, por ejemplo:

- ID interno.
- Handle CAD.
- Manzana y número de lote, si se identifican sin ambigüedad.
- Área calculada y unidad confirmada.
- Perímetro calculado y unidad confirmada.
- Texto de área encontrado en el dibujo, separado del área calculada.
- Calle o frente asociado, solo si la relación geométrica es confiable.
- Estado de validación y estado de georreferenciación.
- Datos comerciales futuros, como precio, disponibilidad o proyecto, en un módulo separado del origen CAD.

Los datos comerciales no deben escribirse dentro de la geometría original. Deben enlazarse por un ID estable para que las actualizaciones del CAD no destruyan la ficha del lote.

## 7. Reglas críticas de geometría

1. Tener tres o más vértices no significa que una figura sea un lote válido.
2. No cerrar automáticamente todas las polilíneas abiertas.
3. Una polilínea abierta cuyo primer y último vértice coinciden dentro de una tolerancia documentada debe marcarse como “cierre geométrico probable”, no repararse en silencio.
4. Una polilínea cuyos extremos no coinciden debe permanecer abierta hasta que una regla explícita o una revisión humana autorice corregirla.
5. Una figura con dos vértices no puede formar por sí sola un polígono con área.
6. Detectar vértices repetidos, segmentos de longitud cero, área casi nula y autointersecciones.
7. Conservar los datos originales incluso si se crea una versión normalizada para dibujar.
8. No usar un simple promedio de vértices como centroide geométrico. Si se necesita centroide, calcularlo a partir del polígono validado.
9. Los lotes irregulares deben conservar todos sus vértices; no aproximarlos con rectángulos.
10. Los errores o casos ambiguos deben presentarse como advertencias o pendientes de revisión.

---

## 8. Unidades y áreas

El DXF de referencia requiere una comprobación específica de unidades:

- Autodesk Viewer muestra en una polilínea seleccionada un área cercana a `200` y una longitud con símbolo de pulgadas.
- El PDF presenta etiquetas de áreas en `m²` y dimensiones como `20.00` y `10.00`.
- Esos datos no bastan por sí solos para afirmar cuál es la unidad efectiva de las coordenadas DXF.

Implementar una inspección de `$INSUNITS` y otras propiedades disponibles. El valor declarado por el archivo es evidencia, no prueba definitiva de la escala geométrica real.

El programa debe:

1. Mostrar la unidad declarada y el nivel de certeza.
2. Conservar las coordenadas sin convertirlas al importar.
3. Comparar varias entidades con dimensiones conocidas del PDF.
4. Solo mostrar área en m² cuando la escala/unidad esté confirmada o cuando el usuario la haya calibrado con evidencia suficiente.
5. Diferenciar área informada en textos del dibujo y área calculada desde vértices.
6. No sobrescribir valores calculados con etiquetas encontradas en el plano.

---

## 9. Modelo de datos requerido

El documento CAD debe tener un inventario global, y cada lote debe ser una entidad interpretada que referencia a la entidad fuente. Cada entidad conserva geometría/metadatos originales y cualquier estado derivado se guarda aparte. Esquema conceptual de lote:

```json
{
  "id": "lot-D528",
  "source": {
    "file": "03- LOTIZACION UNIFICADO.dxf",
    "entityHandle": "D528",
    "entityType": "LWPOLYLINE",
    "layer": "LOTES",
    "unitsDeclared": "unknown",
    "vertices": [
      [1000.0, 2000.0],
      [1020.0, 2000.0],
      [1020.0, 2010.0],
      [1000.0, 2010.0]
    ],
    "closedFlag": true
  },
  "validation": {
    "status": "valid",
    "issues": []
  },
  "measurements": {
    "areaSourceUnitsSquared": null,
    "perimeterSourceUnits": null,
    "areaM2": null
  },
  "georeferencing": {
    "status": "pending",
    "targetCrs": null,
    "coordinates": null
  }
}
```

Las coordenadas del ejemplo son ilustrativas, no corresponden necesariamente a la entidad real `D528`.

Reglas del modelo:

- Debe existir además un objeto de documento con metadatos del archivo, capas, bloques, conteos y todas las entidades leídas.
- El inventario completo no se reduce a la lista de lotes.
- `source.vertices` no se modifica después de importar.
- La geometría transformada se almacena en un campo separado.
- `areaM2` debe ser `null` si la conversión no está validada.
- El estado debe distinguir `valid`, `review`, `invalid` y `pending-georeference`.
- Cada resultado debe poder rastrearse hasta la entidad DXF original.

---

## 10. Georreferenciación con GPS y puntos de control

### 9.1 Fuentes de imagen

El sistema debe soportar dos tipos de fondo:

1. **Imagen georreferenciada:** ortofoto o mosaico con coordenadas y sistema de referencia conocidos.
2. **Imagen sin georreferenciar:** fotografía aérea o captura satelital que requiera puntos de control manuales.

No asumir que toda imagen de dron tiene georreferenciación por píxel. Los metadatos GPS de la cámara pueden describir la posición aproximada de la toma, no la ubicación precisa de cada punto de la imagen.

### 9.2 Puntos de control

Cada punto debe almacenar:

- ID estable.
- Coordenada CAD original `(x, y)`.
- Coordenada de destino y sistema de referencia (CRS).
- Fuente de la coordenada de destino.
- Si se usa para ajustar o para validar.
- Error residual calculado.

Elegir puntos claramente identificables y distribuidos por toda la extensión del terreno, como intersecciones o esquinas de vías. No concentrarlos en un solo sector.

### 9.3 Transformaciones

Implementar primero:

- **Similitud 2D:** traslación, rotación y escala uniforme.
- **Afín 2D:** traslación, rotación, escala independiente por eje y cizallamiento, solo si hay evidencia que la justifique.

Una similitud 2D necesita al menos dos puntos distintos para determinarse matemáticamente. Una transformación afín 2D necesita al menos tres puntos no colineales. En producción se deben usar puntos adicionales para comprobar el ajuste y reservar puntos independientes para validar la precisión.

No usar transformaciones más flexibles para ocultar errores del plano, puntos incorrectos o imágenes distorsionadas. Si los residuos son altos, mostrar el problema y pedir una mejor ortofoto, más puntos de control o revisión topográfica.

### 9.4 Informe de precisión

Mostrar al menos:

- Método de transformación.
- Número de puntos usados y número de puntos independientes.
- Error residual por punto.
- Error RMS.
- Error máximo.
- Unidades del error y CRS.
- Advertencias si la distribución de puntos es pobre o si la precisión no puede interpretarse por falta de unidades conocidas.

No afirmar precisión topográfica basándose únicamente en la apariencia visual.

---

## 11. Formatos de exportación

### JSON de trabajo

Debe preservar coordenadas CAD, metadatos de entidad, validaciones, configuración de unidades y estado de georreferenciación. Debe poder exportarse incluso cuando no haya georreferenciación.

### GeoJSON

Exportar únicamente cuando las coordenadas de destino estén definidas y convertidas correctamente al sistema geográfico esperado por GeoJSON. No escribir coordenadas CAD arbitrarias como si fueran longitud/latitud.

La exportación debe incluir:

- ID del lote.
- Handle de entidad DXF.
- Capa de origen.
- Estado de validación.
- Método de georreferenciación.
- CRS de destino documentado en los metadatos del proyecto.
- Atributos opcionales, solo si se han obtenido de forma confiable.

### Informe de diagnóstico

Exportar conteos por capa y entidad, polígonos válidos, pendientes e inválidos, unidades detectadas, advertencias y errores de georreferenciación.

---

## 12. Interfaz mínima del MVP

La interfaz inicial debe ser funcional y sencilla, con estas áreas:

1. **Entrada DXF:** seleccionar archivo y mostrar nombre, tamaño y estado del parseo.
2. **Inventario:** conteos por capa y tipo de entidad.
3. **Extracción:** botón para extraer lotes y mostrar cantidad de candidatos, válidos y pendientes.
4. **Vista CAD:** ver únicamente los polígonos extraídos y seleccionar un lote.
5. **Diagnósticos:** listar por qué una entidad fue aceptada, marcada para revisión o rechazada.
6. **Imagen de fondo:** cargar ortofoto, mosaico o imagen local.
7. **Puntos de control:** crear, editar y eliminar pares de puntos CAD/destino.
8. **Alineación:** seleccionar método, ejecutar ajuste y consultar residuos.
9. **Superposición:** cambiar transparencia, color y grosor de los contornos.
10. **Exportación:** JSON, informe de diagnóstico y GeoJSON cuando corresponda.

No es necesario implementar edición CAD, rotación manual de cada lote ni herramientas generales de dibujo. El ajuste manual puede existir para la imagen o para los puntos de control, sin cambiar los vértices fuente.

---

## 13. Pruebas obligatorias

Crear fixtures DXF pequeños y reproducibles para:

- Polilínea cerrada válida.
- Polilínea abierta.
- Polilínea abierta cuyos extremos coinciden.
- Entidad de dos vértices.
- Polígono autointersectado.
- Vértices duplicados.
- Círculo en capa `circulos`.
- Polilínea de capa distinta de `LOTES`.
- Entidad dentro de un bloque.
- Unidades declaradas y desconocidas.
- Transformación de similitud con puntos sintéticos conocidos.
- Transformación afín con puntos sintéticos conocidos.
- Punto de control erróneo y cálculo de residuos.
- Exportación GeoJSON con CRS destino configurado.

Para cada prueba, comprobar que el algoritmo no muta las coordenadas fuente.

### Pruebas con el plano real

1. Importar `03- LOTIZACION UNIFICADO.dxf`.
2. Registrar conteos reales por tipo y capa.
3. Extraer candidatos de `LOTES`.
4. Inspeccionar varias entidades, incluyendo la referencia `D528` si su handle está disponible en el parser.
5. Comparar dimensiones/áreas de varios lotes reconocibles con `03- LOTIZACION UNIFICADO-Layout1.pdf`.
6. Investigar y documentar la diferencia entre las unidades mostradas por Autodesk Viewer y las medidas rotuladas en el PDF.
7. Guardar un informe de regresión sin fijar cantidades que dependan del archivo.

---

## 14. Fases de implementación

### Fase 1 — Inspección del DXF

Leer el archivo, listar unidades, capas y tipos de entidad. No construir todavía la georreferenciación.

**Entregable:** informe de inventario del DXF y dudas documentadas.

### Fase 2 — Modelo CAD e inventario completo

Conservar las entidades y metadatos que el parser permita leer; inspeccionar capas, bloques y propiedades. Después, extraer candidatos de la capa `LOTES` como categoría derivada.

**Entregable:** inventario CAD en JSON, informe de cobertura/limitaciones del parser y tabla de entidades candidatas a lote.

### Fase 3 — Validación

Implementar cierre, degeneración, duplicados, autointersecciones y códigos de diagnóstico.

**Entregable:** resultados de pruebas unitarias y clasificación de entidades.

### Fase 4 — Visor CAD por capas y exportación

Dibujar las entidades que se hayan conservado, permitir activar/desactivar categorías y destacar los polígonos de lotes. Exportar el inventario completo a JSON y también ofrecer una exportación filtrada de lotes.

**Entregable:** laboratorio que permita inspeccionar el plano y sus contornos sin perder los datos originales.

### Fase 5 — Imagen y puntos de control

Cargar una imagen, registrar pares de puntos de control y definir el CRS de destino.

**Entregable:** interfaz para registrar puntos con metadatos completos.

### Fase 6 — Ajuste y precisión

Implementar similitud 2D, luego afín si es necesario, con residuos e informe de precisión.

**Entregable:** transformación reproducible y pruebas sintéticas.

### Fase 7 — Superposición y GeoJSON

Dibujar los polígonos transformados y exportar GeoJSON únicamente con referencia geográfica validada.

**Entregable:** superposición y exportación verificables.

### Fase 8 — Integración Angular

Integrar los módulos validados como servicios/utilidades, manteniendo la lógica geométrica fuera de los componentes visuales.

**Entregable:** integración sin duplicar ni reescribir el motor.

No avanzar a la siguiente fase si la fase actual no tiene pruebas y un resultado reproducible.

---

## 15. Instrucciones obligatorias para la IA desarrolladora

La IA debe:

1. Leer este README completo antes de escribir código.
2. Empezar exclusivamente por la Fase 1.
3. Inspeccionar el DXF real antes de elegir supuestos sobre unidades, capas o tipos de entidad.
4. No afirmar que un módulo está terminado sin ejecutar sus pruebas.
5. Registrar comandos ejecutados, resultados reales y limitaciones.
6. Mantener el DXF original sin modificaciones.
7. No inventar coordenadas, áreas, nombres, capas ni puntos de control.
8. No convertir coordenadas CAD en latitud/longitud sin transformación documentada.
9. Separar geometría fuente, geometría validada y geometría transformada.
10. Pedir datos adicionales cuando no sea posible determinar las unidades o la georreferenciación.
11. No sustituir el trabajo con capturas de pantalla ni simulaciones que no procesen el DXF real.
12. Documentar la licencia y compatibilidad de las dependencias seleccionadas.
13. Entregar código ejecutable, pruebas y un resumen preciso de lo que se ha validado.
14. No integrar Angular hasta que la extracción y la transformación hayan pasado las pruebas.

---

## 16. Definición de terminado

El MVP se considera listo para validación cuando:

- [ ] El DXF se importa sin perder coordenadas originales.
- [ ] Se muestran las capas y los conteos por tipo de entidad.
- [ ] Solo se extraen como lotes las entidades que cumplen las reglas configuradas.
- [ ] Las polilíneas abiertas y cerradas se distinguen correctamente.
- [ ] Las geometrías degeneradas y autointersectadas se detectan.
- [ ] Los círculos, textos, líneas auxiliares y otras entidades no se exportan accidentalmente como lotes.
- [ ] Las unidades se muestran como confirmadas, calibradas o desconocidas; nunca se asumen silenciosamente.
- [ ] La geometría fuente permanece inmutable.
- [ ] La imagen de destino puede cargarse y se declara si está georreferenciada.
- [ ] Los puntos de control pueden registrarse y validarse.
- [ ] La transformación calcula residuos y reporta su precisión.
- [ ] El visor superpone los polígonos sin alterar su geometría original.
- [ ] El GeoJSON solo se genera con coordenadas y CRS de destino válidos.
- [ ] Las pruebas unitarias pasan.
- [ ] El plano real produce un informe de regresión.
- [ ] Las limitaciones conocidas están documentadas.
- [ ] La integración Angular queda pendiente hasta aprobar el laboratorio.

---

## Principio rector

**Primero inventariar y conservar todo el CAD; luego clasificar y validar los lotes y demás elementos; después georreferenciar con evidencia, comprobar la precisión y finalmente superponer y exportar.**

El archivo CAD original es la fuente de verdad. Los polígonos de lotes son una vista estructurada importante, pero no sustituyen calles, parques, manzanas, textos, cotas, bloques ni otras entidades. La georreferenciación determina dónde se coloca la geometría sobre la imagen; no debe modificar silenciosamente los vértices ni ocultar errores de unidades, topología o calidad de imagen.
