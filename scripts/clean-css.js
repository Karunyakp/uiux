import fs from 'fs';

let css = fs.readFileSync('src/styles.css', 'utf8');

const marker = '/* =========================================================\r\n   3. System Theme: Signature Teal Blue Mode';
const markerLF = '/* =========================================================\n   3. System Theme: Signature Teal Blue Mode';
const m = css.includes('\r\n') ? marker : markerLF;

const endMarker = 'color: #FFFFFF;\r\n}';
const endMarkerLF = 'color: #FFFFFF;\n}';
const em = css.includes('\r\n') ? endMarker : endMarkerLF;

// Find first occurrence
const firstIdx = css.indexOf(m);
if (firstIdx !== -1) {
  const firstEnd = css.indexOf(em, firstIdx) + em.length;
  console.log('Removing first occurrence from', firstIdx, 'to', firstEnd);
  css = css.slice(0, firstIdx) + css.slice(firstEnd).trimStart();
}

// Find second occurrence
const secondIdx = css.indexOf(m);
if (secondIdx !== -1) {
  const secondEnd = css.indexOf(em, secondIdx) + em.length;
  console.log('Removing second occurrence from', secondIdx, 'to', secondEnd);
  css = css.slice(0, secondIdx) + css.slice(secondEnd).trimStart();
}

let remaining = 0;
let pos = 0;
while ((pos = css.indexOf(m, pos)) !== -1) {
  remaining++;
  pos += m.length;
}
console.log('Remaining occurrences (should be exactly 1):', remaining);

fs.writeFileSync('src/styles.css', css, 'utf8');
