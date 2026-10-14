import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../tests/fixtures');

if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

function createDxf(entityDxf) {
  return `0
SECTION
2
HEADER
9
$ACADVER
1
AC1018
9
$INSUNITS
70
6
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
0
LAYER
2
LOTES
70
0
62
1
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
BLOCKS
0
ENDSEC
0
SECTION
2
ENTITIES
${entityDxf}
0
ENDSEC
0
EOF
`;
}

// 1. Valid closed polyline (10x20 rectangle, area=200)
const validClosedDxf = createDxf(`0
LWPOLYLINE
5
101
8
LOTES
70
1
90
4
10
0.0
20
0.0
10
10.0
20
0.0
10
10.0
20
20.0
10
0.0
20
20.0`);

// 2. Open polyline (gap of 10)
const openDxf = createDxf(`0
LWPOLYLINE
5
102
8
LOTES
70
0
90
3
10
0.0
20
0.0
10
10.0
20
0.0
10
10.0
20
20.0`);

// 3. Repeated first and last point (geometric closure without flag 70=1)
const repeatedPointsDxf = createDxf(`0
LWPOLYLINE
5
103
8
LOTES
70
0
90
5
10
0.0
20
0.0
10
10.0
20
0.0
10
10.0
20
20.0
10
0.0
20
20.0
10
0.0
20
0.0`);

// 4. Two vertex polyline (linear segment, not a polygon)
const twoVertexDxf = createDxf(`0
LWPOLYLINE
5
104
8
LOTES
70
0
90
2
10
0.0
20
0.0
10
10.0
20
10.0`);

// 5. Self-intersecting polygon (Figure 8 / bowtie polygon)
const selfIntersectingDxf = createDxf(`0
LWPOLYLINE
5
105
8
LOTES
70
1
90
4
10
0.0
20
0.0
10
10.0
20
10.0
10
0.0
20
10.0
10
10.0
20
0.0`);

// 6. Sample lot plan with multiple lots and texts
const sampleLotPlanDxf = createDxf(`0
LWPOLYLINE
5
201
8
LOTES
70
1
90
4
10
100.0
20
100.0
10
108.0
20
100.0
10
108.0
20
125.0
10
100.0
20
125.0
0
TEXT
5
202
8
numero lote
10
104.0
20
112.5
40
1.25
1
1`);

fs.writeFileSync(path.join(fixturesDir, 'valid-closed-polyline.dxf'), validClosedDxf);
fs.writeFileSync(path.join(fixturesDir, 'open-polyline.dxf'), openDxf);
fs.writeFileSync(path.join(fixturesDir, 'repeated-first-last-point.dxf'), repeatedPointsDxf);
fs.writeFileSync(path.join(fixturesDir, 'two-vertex-polyline.dxf'), twoVertexDxf);
fs.writeFileSync(path.join(fixturesDir, 'self-intersecting-polygon.dxf'), selfIntersectingDxf);
fs.writeFileSync(path.join(fixturesDir, 'sample-lot-plan.dxf'), sampleLotPlanDxf);

console.log('Fixtures creados exitosamente en tests/fixtures/');

