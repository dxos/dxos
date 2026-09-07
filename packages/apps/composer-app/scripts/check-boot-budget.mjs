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
 *   HyperFormula engine at 548 KB, config yaml at 210 KB). The margin was originally sized under
 *   the smallest of them so a single leak would trip this; after the 2026-08-04 re-baseline it no
 *   longer is — see the NOTE on MAX_PRELOAD_BYTES for what that gave up and what wins it back.
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

import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** Entry + modulepreload links. 20 today; sized to survive a partition reshuffle, not to track it. */
const MAX_PRELOAD_ENTRIES = 25;

/**
 * Total on-disk size of those chunks. 4.25 MB today.
 *
 * Re-baselined 2026-08-13 (was 6.00 MB) after two independent cuts: the Effect 3 -> 4 migration
 * (5.73 -> 4.97 MB) and the `./plugin` -> `XPlugin` namespace split, which evicted the operation
 * handler sets five plugins re-exported from their boot-loaded registration entrypoint
 * (4.97 -> 4.05 MB). That put the ceiling at 4.25 MB against a 4.05 MB graph.
 *
 * Re-baselined 2026-08-26 (was 4.25 MB). `main` had spent the whole 200 KB margin and crossed the
 * line unaided: measured at 4,457,401 bytes against the 4,456,448-byte ceiling — 953 bytes over —
 * while the branch that raised this contributed 124 of the 1,077 it was over by. What is being
 * accepted is ~400 KB accumulated across many changes, not one leak.
 *
 * The ~200 KB margin is deliberately at the low end of the 200-550 KB leak classes above, which
 * preserves the property the 6.00 MB ceiling had given up: a single leak of any known class trips
 * this. Expect it to catch accepted growth too — that is the review point, not a false positive.
 *
 * Re-baselined 2026-08-31 (was 4.45 MB) after `@fluentui/react-tabster` was replaced by
 * `useFocusGroup` in `@dxos/react-ui`, which evicted `tabster` (59,820 bytes), `keyborg` (6,298)
 * and the fluentui wrapper (2,138) from the eager graph — 68,256 bytes attributed through the boot
 * chunks' sourcemaps (`.agents/projects/ark/TASKS.md` Phase 5). Measured at 4,360,490 bytes; the
 * ceiling is set to keep the same ~200 KB margin rather than to bank the whole win, since a budget
 * left where it was would silently absorb it.
 *
 * Re-baselined 2026-09-05 (was 4.35 MB) at Phase 3 of the Radix → Ark migration
 * (`packages/ui/react-ui/docs/MIGRATION.md`), which put Tooltip, Popover and Menu on Zag machines.
 * Measured at 4,565,469 bytes, 4,164 over the ceiling. Attributed through the boot chunks'
 * sourcemaps, the Zag floating stack now in the eager graph is ~78 KB: `menu` 25,704, `focus-trap`
 * 12,810, `tooltip` 9,740, `popover` 7,734, `popper` 6,911, `dismissable` 5,562, `presence` 3,681,
 * `interact-outside` 3,187, `aria-hidden` 1,895, `remove-scroll` 1,143 — which is the whole delta
 * from the Phase 2 measurement (4.28 MB). The Radix floating stack it replaces (`react-popper`
 * 3,915, `-dismissable-layer` 3,312, `-focus-scope` 3,113, `-presence` 1,931, `react-remove-scroll`
 * 5,506, `aria-hidden` 1,466) is still in the graph because `react-select`, `react-dialog` and
 * `react-toast` import it; Phase 4 evicts those, and this ceiling should come back down then. The
 * ~200 KB margin is kept. Phase 4a (Dialog, Main, Select on Ark) measured 4,547,849 — 17,620 back —
 * with `react-toast` still holding the Radix layer. Phase 4b (Toast) measured 4,546,844 with no
 * `@radix-ui` bytes left in the graph: the Zag machines are the new floor, ~186 KB above the
 * 2026-08-31 figure, so the ceiling stays where the Phase 3 re-baseline put it.
 */
const MAX_PRELOAD_BYTES = 4.55 * 1024 * 1024;

const buildDir = path.join(process.cwd(), 'out');
const outDir = path.join(buildDir, 'composer');
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

writeFileSync(
  path.join(buildDir, 'boot-budget.json'),
  JSON.stringify(
    {
      count: entries.length,
      bytes,
      budget: { count: MAX_PRELOAD_ENTRIES, bytes: MAX_PRELOAD_BYTES },
      entries: entries.map((entry) => ({ name: path.basename(entry.href), bytes: entry.bytes })),
    },
    null,
    2,
  ),
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
