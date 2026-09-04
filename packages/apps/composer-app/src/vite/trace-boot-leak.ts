//
// Copyright 2026 DXOS.org
//

// Import-path attribution for `check-boot-budget` failures.
//
// The budget tells you the eager graph grew; it cannot tell you which edge grew it, and the chunk
// sourcemaps only name the modules that landed in a chunk, not how the entry reaches them. This
// walks the entry's static-import closure (the same parse graph `boot-chunking` partitions) and
// prints the shortest import path from the entry to each package that must never be boot-reachable
// — so a leak names the exact edge instead of a list of suspects.
//
// Opt-in, since it walks the whole closure on every build:
//
//   DX_TRACE_BOOT_LEAK=1 moon run composer-app:bundle
//
// Found the `services/index.ts` -> `local-client-services` re-export that put network-manager,
// wa-sqlite, teleport and hypercore back in Composer's boot graph (2026-08-04).

import { type PluginOption } from 'vite';

const TARGETS: Array<[string, RegExp]> = [
  ['client-services', /packages\/sdk\/client-services\//],
  ['echo-host', /packages\/core\/echo\/echo-host\//],
  ['hypercore', /vendor\/hypercore\//],
  ['wa-sqlite', /wa-sqlite/],
  ['network-manager', /packages\/core\/mesh\/network-manager\//],
  ['teleport', /packages\/core\/mesh\/teleport\//],
  ['automerge-repo', /@automerge\+automerge-repo/],
  // Property-testing generators reached from production code — `effect`'s `Arbitrary` pulls
  // fast-check (and pure-rand with it), which is a whole boot chunk of test-only machinery.
  ['fast-check', /node_modules\/\.pnpm\/fast-check@/],
  ['effect/Arbitrary', /node_modules\/effect\/dist\/esm\/Arbitrary\.js$/],
  ['react-aria', /node_modules\/\.pnpm\/@react-aria\+/],
  // The graph packages are import-map shared, so a stray boot edge ships them whole.
  ['app-graph', /packages\/sdk\/app-graph\//],
  ['dxos-graph', /packages\/common\/graph\//],
  ['effect/Graph', /node_modules\/effect\/dist\/Graph\.js$/],
];

export const traceBootLeak = (entry: string): PluginOption =>
  !process.env.DX_TRACE_BOOT_LEAK
    ? null
    : ({
        name: 'trace-boot-leak',
        generateBundle: {
          order: 'pre',
          handler(this: any) {
            const infoCache = new Map<string, any>();
            const infoOf = (id: string) => {
              if (!infoCache.has(id)) {
                infoCache.set(id, this.getModuleInfo(id));
              }
              return infoCache.get(id);
            };
            if (!infoOf(entry)) {
              console.log('[trace-boot-leak] entry not in graph:', entry);
              return;
            }

            // BFS so the recorded parent chain is a shortest path.
            const parent = new Map<string, string | null>([[entry, null]]);
            const queue = [entry];
            const found = new Map<string, string>();
            while (queue.length > 0) {
              const current = queue.shift()!;
              for (const dep of infoOf(current)?.importedIds ?? []) {
                if (parent.has(dep)) {
                  continue;
                }
                parent.set(dep, current);
                queue.push(dep);
                for (const [label, pattern] of TARGETS) {
                  if (!found.has(label) && pattern.test(dep)) {
                    found.set(label, dep);
                  }
                }
              }
            }

            const short = (id: string) => id.split('?')[0].replace(/^.*\/(packages|vendor|node_modules)\//, '$1/');
            console.log(`\n[trace-boot-leak] static closure: ${parent.size} modules`);
            for (const [label] of TARGETS) {
              const hit = found.get(label);
              if (!hit) {
                console.log(`\n[trace-boot-leak] ${label}: NOT in the static closure`);
                continue;
              }
              const path: string[] = [];
              for (let node: string | null | undefined = hit; node; node = parent.get(node)) {
                path.push(short(node));
              }
              console.log(`\n[trace-boot-leak] ${label} reached via ${path.length - 1} hops:`);
              path.reverse().forEach((step, index) => console.log(`  ${String(index).padStart(2)}. ${step}`));
            }
            console.log('');
          },
        },
      } as PluginOption);
