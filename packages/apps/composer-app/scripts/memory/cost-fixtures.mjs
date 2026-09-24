//
// Copyright 2026 DXOS.org
//

/**
 * Generates the single-variable pages behind the per-unit cost table in
 * `.agents/projects/memory-usage/ALLOCATION.md`, so those numbers can be re-run.
 *
 * Each pair differs in exactly one thing; measure both with
 * `ledger.mjs <url> --detached --ready none` and subtract the footprints.
 *
 * Usage: node cost-fixtures.mjs <outDir> && (cd <outDir> && python3 -m http.server 4180)
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: cost-fixtures.mjs <outDir>');
  process.exit(1);
}

const page = (title, body) => `<!doctype html><title>${title}</title><body>${body}</body>`;
const write = (file, content) => {
  mkdirSync(path.dirname(path.join(outDir, file)), { recursive: true });
  writeFileSync(path.join(outDir, file), content);
};

/** One exported function, distinct enough that nothing dedupes it. */
const fn = (i) =>
  `export function f${i}(a, b) {\n` +
  `  const t = a * ${i} + b;\n` +
  `  const s = 'f${i}' + t.toString(36);\n` +
  `  return { id: ${i}, s, t };\n` +
  `}\n`;

// Module count: same code, same functions, split one way or 1000 ways.
const MODULES = 1000;
const PER_MODULE = 12;
for (let m = 0; m < MODULES; m++) {
  write(`many/m${m}.js`, Array.from({ length: PER_MODULE }, (_, k) => fn(m * PER_MODULE + k)).join(''));
}
write(
  'many/entry.js',
  Array.from({ length: MODULES }, (_, m) => `import * as n${m} from './m${m}.js';\n`).join('') +
    `globalThis.__keep = [${Array.from({ length: MODULES }, (_, m) => `n${m}`).join(',')}];\n`,
);
write('many/index.html', page('many', '<script type="module" src="./entry.js"></script>'));
write(
  'one/entry.js',
  Array.from({ length: MODULES * PER_MODULE }, (_, i) => fn(i)).join('') +
    `globalThis.__keep = [${Array.from({ length: MODULES }, (_, m) => `f${m * PER_MODULE}`).join(',')}];\n`,
);
write('one/index.html', page('one', '<script type="module" src="./entry.js"></script>'));

// Request count, to separate it from the module count above: same files, fetched
// as text and thrown away, so no module records are created.
for (const count of [0, 1000]) {
  write(
    `req${count}.html`,
    page(
      'req',
      `<script>(async () => {
  for (let i = 0; i < ${count}; i++) { await fetch('./many/m' + i + '.js').then((r) => r.text()); }
  document.title = 'req ${count}';
})();</script>`,
    ),
  );
}

// Function count, at one module.
for (const count of [12000, 60000]) {
  write(
    `fn${count}.js`,
    Array.from({ length: count }, (_, i) => fn(i)).join('') +
      `globalThis.__keep = [${Array.from({ length: Math.ceil(count / 100) }, (_, i) => `f${i * 100}`).join(',')}];\n`,
  );
  write(`fn${count}.html`, page('fn', `<script type="module" src="./fn${count}.js"></script>`));
}

// Dedicated workers, doing nothing, to price the realm itself.
write('w.js', "let n = 0;\nsetInterval(() => { n++; }, 1000);\nself.postMessage('ready');\n");
for (const count of [0, 4]) {
  write(
    `workers${count}.html`,
    page(
      'workers',
      `<script>globalThis.__w = [];
for (let i = 0; i < ${count}; i++) { globalThis.__w.push(new Worker('./w.js')); }</script>`,
    ),
  );
}

// Binary data held inside a worker rather than on the page.
write(
  'wbuf.js',
  `const held = [];
onmessage = (e) => {
  for (let i = 0; i < e.data; i++) {
    const b = new ArrayBuffer(1024 * 1024);
    new Uint8Array(b).fill(i & 255);
    held.push(b);
  }
  postMessage(held.length);
};
`,
);
for (const count of [0, 80]) {
  write(
    `wbuf${count}.html`,
    page(
      'wbuf',
      `<script>const w = new Worker('./wbuf.js');
globalThis.__w = w;
w.onmessage = (e) => { document.title = 'wbuf ' + e.data; };
w.postMessage(${count});</script>`,
    ),
  );
}

// Styling cost per element. The class list resolves against a real stylesheet, so
// the comparison prices matched rules rather than an inert attribute string.
const ELEMENTS = 3000;
const CLASS_LIST = 'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm font-medium shadow-sm';
const SHEET = CLASS_LIST.split(' ')
  .map((name, i) => `.${name} { padding-left: ${i}px; margin-top: ${i}px; }`)
  .join('\n');
const VARIABLES = '--x-pad:8px;--x-gap:4px;--x-fg:#111;--x-bg:#fff;--x-ring:#3b82f6;--x-radius:6px;';
for (const [name, cls, style] of [
  ['plain', 'c', ''],
  ['classy', CLASS_LIST, ''],
  ['vars', 'c', VARIABLES],
]) {
  write(
    `${name}.html`,
    `<!doctype html><title>dom</title><style>\n.c { padding: 1px; }\n${SHEET}\n</style><body><div id="r"></div><script>
const root = document.getElementById('r');
for (let i = 0; i < ${ELEMENTS}; i++) {
  const el = document.createElement('div');
  el.className = ${JSON.stringify(cls)};
  ${style ? `el.setAttribute('style', ${JSON.stringify(style)});` : ''}
  el.textContent = 'row ' + i;
  root.appendChild(el);
}
document.title = 'dom ' + document.getElementsByTagName('*').length;
</script></body>`,
  );
}

console.log(`wrote fixtures to ${outDir}`);
console.log(`serve with:  (cd ${outDir} && python3 -m http.server 4180)`);
