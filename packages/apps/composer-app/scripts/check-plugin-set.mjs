//
// Copyright 2026 DXOS.org
//

/**
 * Structural guardrail on what a curated-plugin-set build actually ships: fails when a plugin the
 * set does not name reached the built module graph anyway.
 *
 * `DX_PLUGIN_SET=production` works by aliasing `./plugin-defs` to `plugin-defs.production.tsx`
 * (vite.config.ts). Nothing else enforces it — a stray import from a shipped plugin, a lost alias,
 * or a plugin reached through `main.tsx` rather than the set would all bundle silently and only
 * show up as bytes. The UI cannot tell you either: a plugin absent from the registry can still be
 * in the bundle.
 *
 * What counts as evidence: a plugin's BODY module (`src/plugin.tsx` and its platform variants),
 * which is what `#plugin` resolves to and what `Plugin.lazy` imports on first enable. That module is
 * package-internal — nothing outside a plugin imports another plugin's body — so its presence means
 * the plugin itself entered the graph, not that a shipped plugin borrowed a helper from it.
 *
 * Deliberately NOT "any module under a non-shipped plugin's package": plugins legitimately share
 * schema and components across package boundaries (`plugin-x/types` imported by a shipped plugin),
 * and rolldown lists tree-shaken modules in sourcemap `sources` regardless, so a package-level scan
 * reports code that does not ship. See the same caveat in check-boot-budget.mjs.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const appDir = process.cwd();
const outDir = path.join(appDir, 'out/composer');
const pluginsDir = path.resolve(appDir, '../../plugins');

/** Plugin package names a set's sources can reach, by the `@dxos/plugin-<name>` specifiers they import. */
const readSet = (...files) => {
  const names = new Set();
  for (const file of files) {
    const source = readFileSync(path.join(appDir, file), 'utf8');
    for (const [, name] of source.matchAll(/@dxos\/plugin-([a-z0-9-]+)/g)) {
      names.add(name);
    }
  }
  return names;
};

const shipped = readSet('src/plugin-defs.production.tsx', 'src/plugin-defs.core.tsx');
const allPlugins = readdirSync(pluginsDir).filter((name) => name.startsWith('plugin-'));

/** Every `*.js.map` under the build output; the `sources` arrays are the module graph. */
const mapFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (full.endsWith('.js.map')) {
      mapFiles.push(full);
    }
  }
};
walk(outDir);

if (mapFiles.length === 0) {
  console.error(
    `ERROR: no sourcemaps under ${path.relative(appDir, outDir)} — this check reads them, so a build\n` +
      'with `build.sourcemap` off cannot be verified. Run `moon run composer-app:bundle-production` first.',
  );
  process.exit(1);
}

// `sources` entries are relative to the map file, so the repo-root prefix varies; the `plugins/`
// parent is the stable part. Platform variants (`plugin.node.ts`, `plugin.workerd.ts`) count too —
// none of them belongs in a browser bundle, and matching them makes a mis-resolved condition visible.
const BODY_MODULE = /(?:^|\/)plugins\/(plugin-[a-z0-9-]+)\/src\/plugin(?:\.[a-z]+)?\.tsx?$/;

// `<plugin-name>` -> the chunks whose sourcemap names its body module.
const found = new Map();
const shippedSeen = new Set();
for (const mapFile of mapFiles) {
  const { sources = [] } = JSON.parse(readFileSync(mapFile, 'utf8'));
  for (const source of sources) {
    const match = source.match(BODY_MODULE);
    if (!match) {
      continue;
    }
    const name = match[1];
    if (shipped.has(name.replace(/^plugin-/, ''))) {
      shippedSeen.add(name);
      continue;
    }
    const chunks = found.get(name) ?? new Set();
    chunks.add(path.basename(mapFile, '.map'));
    found.set(name, chunks);
  }
}

console.log(
  `plugin set: ${shipped.size} of ${allPlugins.length} plugin packages shipped, ` +
    `${mapFiles.length} chunks scanned, ${shippedSeen.size} shipped bodies seen, ${found.size} unexpected`,
);

// Fail closed. A build that names no shipped plugin body either did not bundle the app or — far more
// likely — writes `sources` in a shape `BODY_MODULE` no longer matches, in which case "0 unexpected"
// is the pattern missing everything rather than the invariant holding.
if (shippedSeen.size === 0) {
  console.error(
    'ERROR: no shipped plugin body found in any sourcemap, so this check proved nothing.\n' +
      "Sourcemap `sources` paths no longer match `BODY_MODULE` — print a chunk's `sources` and fix the pattern.",
  );
  process.exit(1);
}

if (found.size === 0) {
  process.exit(0);
}

for (const [name, chunks] of [...found].sort()) {
  console.error(`  ${name}  (${[...chunks].sort().join(', ')})`);
}
console.error(
  `\nERROR: ${found.size} plugin(s) outside the production set reached the bundle.\n` +
    'Either the plugin is imported from something the set does reach — trace it back and import the\n' +
    'narrow module instead of the plugin — or `DX_PLUGIN_SET=production` did not take effect for this\n' +
    'build, in which case the `./plugin-defs` alias in vite.config.ts is the place to look.',
);
process.exit(1);
