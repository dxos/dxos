//
// Copyright 2026 DXOS.org
//

/**
 * Structural guardrail for the eager boot graph: fails when the built `index.html`'s entry
 * script plus its modulepreload closure — vite's exact static-dependency set for startup —
 * exceeds budget. Nothing watched this before, which is how the eager graph reached 749 chunks
 * / 8.8 MB unnoticed (AUDIT.md §12).
 *
 * Two axes, catching different regressions:
 *
 * - BYTES catches leaks. A boot-reachable module importing a barrel instead of a subpath pulls
 *   its package in wholesale; the classes we have actually hit are 200-550 KB each (the
 *   HyperFormula engine at 548 KB, config yaml at 210 KB). The margin is deliberately narrower
 *   than the smallest of them, so a single leak of the kind we keep finding trips this.
 *
 * - COUNT catches the chunk partition collapsing. Boot chunks are built by a cycle-safe
 *   topological partition (see `bootChunkingPlugin` in vite.config.ts) that took preload
 *   requests from 520 to ~20; if that silently stops applying — a rolldown API change, a bug in
 *   the buildStart reset — the count snaps back to the hundreds. It is NOT a proxy for bytes:
 *   bucket boundaries follow the SCC condensation, not size, and the count moved 13 -> 20 on a
 *   legitimate change, so the headroom is sized for a partition reshuffle rather than kept tight.
 *
 * Deliberately NOT a per-package forbidden list: a chunk's sourcemap `sources` names modules
 * that were then tree-shaken to nothing (react-aria lists 177 modules in the boot chunks but
 * emits no `useFocusRing`), so presence there is not evidence that code ships. Attributing
 * bytes through the sourcemap mappings is the way to do that, and it needs real tooling.
 *
 * Raise a budget only for growth you have looked at and accepted — that is the review point
 * this check exists to create.
 */

import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/** Entry + modulepreload links. ~20 today; sized to survive a partition reshuffle, not to track it. */
const MAX_PRELOAD_ENTRIES = 30;

/** Total on-disk size of those chunks. ~4.45 MB today; margin is under one leak class. */
const MAX_PRELOAD_BYTES = 4.75 * 1024 * 1024;

const outDir = path.join(process.cwd(), 'out/composer');
const html = readFileSync(path.join(outDir, 'index.html'), 'utf8');

const hrefs = [
  ...[...html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)].map((match) => match[1]),
  ...[...html.matchAll(/rel="modulepreload"[^>]*href="([^"]+)"/g)].map((match) => match[1]),
];

const entries = [];
for (const href of hrefs) {
  if (/^[a-z]+:\/\//.test(href)) {
    // Externally hosted — not part of the built output, so not ours to budget.
    continue;
  }
  // Fail closed: swallowing a missing asset would understate the total and pass a regression.
  entries.push({ href, bytes: statSync(path.join(outDir, href.replace(/^\//, ''))).size });
}

const bytes = entries.reduce((total, entry) => total + entry.bytes, 0);
const asMb = (value) => (value / 1024 / 1024).toFixed(2);

console.log(
  `boot graph: ${entries.length} preload entries, ${asMb(bytes)} MB ` +
    `(budget: ${MAX_PRELOAD_ENTRIES} entries, ${asMb(MAX_PRELOAD_BYTES)} MB)`,
);

const overCount = entries.length > MAX_PRELOAD_ENTRIES;
const overBytes = bytes > MAX_PRELOAD_BYTES;
if (!overCount && !overBytes) {
  process.exit(0);
}

for (const entry of [...entries].sort((first, second) => second.bytes - first.bytes).slice(0, 15)) {
  console.error(`  ${(entry.bytes / 1024).toFixed(1).padStart(9)} KB  ${path.basename(entry.href)}`);
}

if (overCount) {
  console.error(
    `\nERROR: ${entries.length} preload entries exceeds ${MAX_PRELOAD_ENTRIES}.\n` +
      'The boot chunk partition is likely not applying — check `bootChunkingPlugin` in vite.config.ts\n' +
      '(a count in the hundreds means it dropped out entirely, not that the app grew).',
  );
}
if (overBytes) {
  console.error(
    `\nERROR: ${asMb(bytes)} MB of eager boot graph exceeds ${asMb(MAX_PRELOAD_BYTES)} MB.\n` +
      'Something boot-reachable statically imports code that should be lazy. Usual causes: a new\n' +
      'import reaching a package barrel instead of a light subpath (see the dxos-subpath-imports\n' +
      'lint), or a plugin stub pulling its implementation instead of staying a `Plugin.lazy` stub.',
  );
}
process.exit(1);
