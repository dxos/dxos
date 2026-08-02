//
// Copyright 2026 DXOS.org
//

/**
 * Guardrail for the eager startup graph: fails the build when the modulepreload
 * set in the built `index.html` (vite's exact static-dependency closure of the
 * entry) exceeds budget. The 2026-08-02 regression (AUDIT.md §12) grew the eager
 * graph from 393 KB to 10.8 MB over six weeks because nothing watched it.
 *
 * Budgets are deliberately loose (~15% headroom over the post-fix baseline of
 * 519 chunks / 3.72 MB) — the point is to catch structural leaks (a plugin stub
 * dragging its implementation), not to flag ordinary growth. If this fails your
 * build: `DX_STATS=1 pnpm exec vite build`, then
 * `node scripts/trace-eager-graph.mjs --to <package>` to find the new chain.
 */

import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const MAX_PRELOAD_CHUNKS = 600;
const MAX_PRELOAD_BYTES = 4.5 * 1024 * 1024;

const outDir = path.join(process.cwd(), 'out/composer');
const html = readFileSync(path.join(outDir, 'index.html'), 'utf8');
const preloads = [...html.matchAll(/rel="modulepreload"[^>]*href="([^"]+)"/g)].map((match) => match[1]);

let bytes = 0;
for (const href of preloads) {
  try {
    bytes += statSync(path.join(outDir, href)).size;
  } catch {
    // Asset emitted elsewhere (e.g. absolute URL) — count as zero.
  }
}

const megabytes = (bytes / 1024 / 1024).toFixed(2);
console.log(
  `eager preload graph: ${preloads.length} chunks, ${megabytes} MB (budget: ${MAX_PRELOAD_CHUNKS} chunks, ${(MAX_PRELOAD_BYTES / 1024 / 1024).toFixed(1)} MB)`,
);

if (preloads.length > MAX_PRELOAD_CHUNKS || bytes > MAX_PRELOAD_BYTES) {
  console.error(
    'ERROR: the eager startup graph exceeds budget — something static-imports code that should be lazy.\n' +
      'Diagnose: DX_STATS=1 pnpm exec vite build && node scripts/trace-eager-graph.mjs --summary\n' +
      'Common causes: a plugin /plugin stub importing its implementation (must stay a Plugin.lazy\n' +
      'stub + light handler-set leaf), or a new static import in main.tsx/util reaching a barrel.\n' +
      'See AUDIT.md §12. Raise the budget here only for justified, reviewed growth.',
  );
  process.exit(1);
}
