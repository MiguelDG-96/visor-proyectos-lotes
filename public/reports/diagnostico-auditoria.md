# Informe de Auditoría, Georreferenciación y Diagnóstico CAD/GIS

**Proyecto:** Lotización Chávez Pata, Moyobamba, San Martín, Perú  
**Fecha de Emisión:** 2026-10-14T00:09:10.323Z  
**Sistema de Referencia:** WGS 84 / UTM Zona 18 Sur (EPSG:32718)  
**Sistema Geodésico Destino:** WGS 84 Geográficas (EPSG:4326)  

---

## 1. Resumen de Inventario y Preservación de Entidades

- **Total de Entidades CAD Preservadas:** 7759 (100% preservadas en modelo inmutable)
- **Capas CAD Inspeccionadas:** 29
- **Bloques e Inserciones Preservadas:** 31
- **Unidad de Trabajo:** Métrico Decimal en Coordenadas de Cuadrícula UTM (Este: 279,450 a 280,100 m | Norte: 9,335,800 a 9,336,650 m)

---

## 2. Diagnóstico de Lotes y Validación Topológica

- **Candidatos Extraídos de Capa LOTES:** 719
- **Lotes Válidos (Cierre Formal / Probable):** 711
- **Lotes Pendientes de Revisión (Needs Review):** 0
- **Lotes Inválidos:** 6
- **Entidades Supersedidas (Borradores duplicados eliminados):** 2
- **Lotes con Reparación Auditable o Reconstrucción:** 2
- **Superficie Total Certificada de Lotes:** 154408.78 m²

---

## 3. Auditoría de Reparaciones Geométricas

| Lote / Handle | Manzana | Tipo de Operación | Brecha Original | Área Resultante | Coincidencia PDF |
|---|---|---|---|---|---|
| Lote 1 (DA92) | MZ-Z | Snap Closure | 1.62 cm | 207.26 m² | 100.00% (207.26 m²) |
| Lote 2 (RECON) | MZ-Z | Reconstrucción Residual | Polígono Faltante | 167.49 m² | 99.89% (167.30 m²) |
| Lote 6 (DA4D) | MZ-Z | Supersedido por D96C | Abierto (3 lados) | 257.97 m² | 100.00% (257.97 m²) |
| Lote 7 (DA4E) | MZ-Z | Supersedido por DA93 | Abierto (3 lados) | 237.07 m² | 100.00% (237.07 m²) |

---

## 4. Georreferenciación y Evaluación de Puntos de Control (GCP)

- **Método de Proyección:** Transversa de Mercator de Alta Precisión (Algoritmo de Karney / Krueger)
- **Factor de Escala de Cuadrícula ($k$):** ~1.000210 (a 220.4 km al oeste del meridiano central -75°)
- **Convergencia de Meridianos ($gamma$):** -0.273°
- **Modelo de Transformación Recomendado:** **Helmert 2D (Similitud 4 Parámetros)**
  - *Justificación Técnica:* Protege la ortogonalidad y los ángulos rectos de los lotes urbanos. No introduce cizallamiento artificial.
- **Error Cuadrático Medio (RMSE):** < 0.05 m (Precisión subdecimétrica)
- **Discrepancia Superficie Terreno vs Cuadrícula CAD:** 0.042%

---

## 5. Dictamen Técnico y Estado de Entrega

El plano CAD presenta correspondencia topográfica y geométrica con el PDF del proyecto. Todas las operaciones de cálculo preservan la geometría original de origen (`source.vertices`) sin alteración destructiva.
