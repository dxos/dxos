//
// Copyright 2026 DXOS.org
//

// Regenerates `wiki.json` from the repository's specs: `node packages/plugins/plugin-canvas/src/samples/architecture/wiki/generate-wiki.ts`.
// The routine that runs it is `agents/routines/architecture-wiki.md`.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { buildWiki, parseFeatureMap } from './generate.ts';

/** Spec filenames paged even when no feature cites them; any other `.mdl` is paged only when cited. */
const SPEC_FILES = new Set(['PLUGIN.mdl', 'SPEC.mdl']);

/** Directories that hold build output, dependencies or test fixtures rather than specs. */
const SKIPPED_DIRS = new Set(['node_modules', 'dist', '.git', '__fixtures__', '.moon', '.local-pack']);

const findSpecs = (root: string, dir: string, found: string[]): string[] => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        findSpecs(root, join(dir, entry.name), found);
      }
    } else if (SPEC_FILES.has(entry.name)) {
      found.push(relative(root, join(dir, entry.name)));
    }
  }
  return found;
};

const root = resolve(import.meta.dirname, '../../../../../../..');
const featureMap = readFileSync(join(root, 'FEATURES.mdl'), 'utf8');
const cited = parseFeatureMap(featureMap).features.flatMap((feature) => feature.specs);
const paths = new Set([
  ...findSpecs(root, join(root, 'packages'), []),
  ...findSpecs(root, join(root, 'tools'), []),
  ...cited,
]);
const specs = new Map<string, string>();
for (const path of [...paths].sort()) {
  try {
    specs.set(path, readFileSync(join(root, path), 'utf8'));
  } catch {
    // A cited spec that does not exist is reported by `buildWiki` as missing.
  }
}

const { wiki, missing } = buildWiki({ featureMap, specs });
const output = join(import.meta.dirname, 'wiki.json');
writeFileSync(output, `${JSON.stringify(wiki, null, 2)}\n`);
const pages = wiki.areas.reduce((count, area) => count + area.pages.length, 0);
process.stdout.write(`${relative(root, output)}: ${wiki.areas.length} areas, ${pages} pages.\n`);
if (missing.length > 0) {
  process.stdout.write(`Cited by FEATURES.mdl but not found:\n${missing.map((path) => `  ${path}`).join('\n')}\n`);
}
