import fs from 'fs';
import { DxfReader } from '../src/dxf/dxf-reader.js';

const dxfPath = '03- LOTIZACION UNIFICADO.dxf';
const buffer = fs.readFileSync(dxfPath);
const reader = new DxfReader();
const doc = reader.read(buffer, '03- LOTIZACION UNIFICADO.dxf');

console.log('Searching for texts in PDF screenshot 2...');

// Search for keywords
const keywords = ['CALLE 10', 'CALLE 9', 'RECREACION', 'OTROS FINES', 'Mz - C', 'Mz - D', 'Mz - A', 'Mz-A', 'Mz - B', 'Mz-B', '2034.99', '536.19', 'PROPIEDAD DE TERCEROS'];
for (const kw of keywords) {
  const matches = doc.entities.filter(e => (e.source.text || '').toUpperCase().includes(kw.toUpperCase()));
  console.log(`Keyword '${kw}': found ${matches.length} matches`);
  for (const m of matches.slice(0, 3)) {
    const p = m.source.startPoint || m.source.position;
    console.log(`   Layer: [${m.layer}], Handle: ${m.handle}, Text: '${m.source.text}', Pos: (${p?.x.toFixed(2)}, ${p?.y.toFixed(2)}), Space: ${m.space}`);
  }
}

// Let's also search in MANZANEO and PDF_Text layers
console.log('\n--- Entities in layer MANZANEO ---');
const manzaneo = doc.entities.filter(e => e.layer === 'MANZANEO');
for (const m of manzaneo) {
  console.log(`  Handle: ${m.handle}, Type: ${m.type}, Text: '${m.source.text}', Pos:`, m.source.startPoint || m.source.position);
}

console.log('\n--- Sample entities in layer PDF_Text ---');
const pdfText = doc.entities.filter(e => e.layer === 'PDF_Text');
console.log(`Total in PDF_Text: ${pdfText.length}`);
for (const m of pdfText.slice(0, 15)) {
  console.log(`  Handle: ${m.handle}, Type: ${m.type}, Text: '${m.source.text}', Pos:`, m.source.startPoint || m.source.position);
}


