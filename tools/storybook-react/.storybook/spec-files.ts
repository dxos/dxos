//
// Copyright 2026 DXOS.org
//

import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { type Plugin } from 'vite';

const SPEC_QUERY = '?spec';

/** Directory beside the page that holds the published specs, where stories fetch them from. */
const SPEC_DIR = 'specs';

/** Manifest of the specs a build ships, keyed by source key (`github:dxos/dxos/<path>`), valued by served path. */
const SPEC_MANIFEST = `${SPEC_DIR}/manifest.json`;

/**
 * Serves `<file>.mdl?spec` imports as `{ path, text }` (the repo-relative path and the text at build time).
 *
 * A static build also writes every imported spec to `specs/<path>` and lists them in `specs/manifest.json`,
 * so a published page can fetch a newer copy of a spec without a rebuild of the bundle.
 */
export const specFilesPlugin = ({ rootDir }: { rootDir: string }): Plugin => {
  const specs = new Map<string, string>();
  return {
    name: 'dxos:spec-files',
    enforce: 'pre',
    load: async (id) => {
      if (!id.endsWith(SPEC_QUERY)) {
        return null;
      }
      const file = id.slice(0, -SPEC_QUERY.length);
      const text = await readFile(file, 'utf8');
      const path = relative(rootDir, file);
      specs.set(path, text);
      return `export default ${JSON.stringify({ path, text })};`;
    },
    generateBundle: function () {
      if (specs.size === 0) {
        return;
      }
      const manifest: Record<string, string> = {};
      for (const [path, text] of [...specs].sort(([left], [right]) => left.localeCompare(right))) {
        manifest[`github:dxos/dxos/${path}`] = `${SPEC_DIR}/${path}`;
        this.emitFile({ type: 'asset', fileName: `${SPEC_DIR}/${path}`, source: text });
      }
      this.emitFile({ type: 'asset', fileName: SPEC_MANIFEST, source: JSON.stringify(manifest, null, 2) + '\n' });
    },
  };
};
