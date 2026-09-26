//
// Copyright 2026 DXOS.org
//

// A page in proxy mode loads no Automerge: ECHO serves its documents as tab documents, and only the
// worker holds Automerge. This walks every import the page can load, static or dynamic, and fails
// the build if Automerge is reachable without passing through one of the gates, the modules a page
// imports only when it holds Automerge documents itself (replica mode, or HOST mode's services).

import { type PluginOption } from 'vite';

/** Modules that must not load in a proxy-mode page: Automerge's JS and wasm glue, and automerge-repo's root. */
const AUTOMERGE: RegExp[] = [
  /node_modules\/\.pnpm\/@automerge\+automerge@[^/]+\/node_modules\/@automerge\/automerge\//,
  /node_modules\/\.pnpm\/@automerge\+automerge-subduction@/,
  // Its helpers (cbor) import no Automerge; everything else reaches its root, which does.
  /node_modules\/\.pnpm\/@automerge\+automerge-repo@[^/]+\/node_modules\/@automerge\/automerge-repo\/(?!dist\/helpers\/)/,
];

export type AutomergeGatesOptions = {
  /** The page's entry module. */
  entry: string;
  /** Modules a page imports dynamically only when it holds Automerge documents; the walk stops at them. */
  gates: RegExp[];
  /** Report reachable Automerge modules without failing the build. */
  report?: boolean;
};

export const automergeGates = ({ entry, gates, report = false }: AutomergeGatesOptions): PluginOption => ({
  name: 'automerge-gates',
  apply: 'build',
  generateBundle: {
    order: 'pre',
    handler() {
      const root = this.getModuleInfo(entry);
      if (!root) {
        this.error(`[automerge-gates] entry not in the module graph: ${entry}`);
      }
      // BFS, so each recorded parent chain is a shortest path from the entry.
      const parent = new Map<string, string | null>([[entry, null]]);
      const dynamic = new Set<string>();
      const queue = [entry];
      // Modules outside Automerge that import it directly: the edges a fix has to cut.
      const importers = new Map<string, string>();
      while (queue.length > 0) {
        const current = queue.shift();
        if (current === undefined) {
          break;
        }
        const info = this.getModuleInfo(current);
        const lazy = (info?.dynamicallyImportedIds ?? []).filter((id) => !gates.some((gate) => gate.test(id)));
        for (const id of [...(info?.importedIds ?? []), ...lazy]) {
          const isAutomerge = AUTOMERGE.some((pattern) => pattern.test(id));
          if (isAutomerge && !AUTOMERGE.some((pattern) => pattern.test(current)) && !importers.has(current)) {
            importers.set(current, id);
          }
          if (!parent.has(id)) {
            parent.set(id, current);
            if (!info?.importedIds.includes(id)) {
              dynamic.add(id);
            }
            queue.push(id);
          }
        }
      }
      if (importers.size === 0) {
        console.log(
          `[automerge-gates] ${parent.size} modules reachable from the page past no gate; none is Automerge.`,
        );
        return;
      }

      const short = (id: string) => id.split('?')[0].replace(/^.*\/(packages|vendor|node_modules)\//, '$1/');
      const pathTo = (id: string) => {
        const steps: string[] = [];
        for (let node: string | null | undefined = id; node; node = parent.get(node)) {
          steps.push(`${short(node)}${dynamic.has(node) ? ' (dynamic import)' : ''}`);
        }
        return steps.reverse();
      };
      const message = [
        `[automerge-gates] Automerge is reachable from the page without a gate, through ${importers.size} importers:`,
        ...[...importers].map(([importer, automerge]) =>
          [...pathTo(importer), short(automerge)].map((step, index) => `  ${index}. ${step}`).join('\n'),
        ),
      ].join('\n\n');
      if (report) {
        console.log(`\n${message}\n`);
      } else {
        this.error(message);
      }
    },
  },
});
