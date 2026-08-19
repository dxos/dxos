//
// Copyright 2026 DXOS.org
//

/**
 * Structural guardrail on what a curated-plugin-set build actually ships: fails when a plugin the
 * set does not name reached the app's module graph anyway.
 *
 * `DX_PLUGIN_SET=production` works by aliasing `./plugin-defs` to `plugin-defs.production.tsx`
 * (vite.config.ts). Nothing else enforces it — a stray import from a shipped plugin, a lost alias,
 * or a plugin reached through `main.tsx` rather than the set would all bundle silently and only show
 * up as bytes. The UI cannot tell you either: a plugin absent from the registry can still be in the
 * bundle.
 *
 * Scoped to the chunks reachable from `index.html`, NOT to everything under the output dir. The
 * build emits five HTML entries and `devtools.html` IS the devtools app — its graph carries
 * plugin-devtools in every environment, which a whole-directory scan reports as a leak.
 *
 * The set is read from the two source files, so a plugin core carries for both sets counts as shipped
 * — plugin-registry, for instance, whose lazy chunk a curated build emits and never imports (the
 * `isExtensible` flag withholds the plugin, `DX_PLUGIN_SET` is what keeps code out of the graph).
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

import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
      names.add(`plugin-${name}`);
    }
  }
  return names;
};

const shipped = readSet('src/plugin-defs.production.tsx', 'src/plugin-defs.core.tsx');
const allPlugins = readdirSync(pluginsDir).filter((name) => name.startsWith('plugin-'));

/**
 * Chunk specifiers a chunk reaches: `from '…'` / `export … from '…'` and static-or-dynamic
 * `import('…')`. All three quote styles — rolldown emits dynamic imports as template literals
 * (`import(\`./plugin-x.js\`)`), and missing that form silently understates the graph.
 */
const SPECIFIER = /(?:\bfrom|\bimport)\s*\(?\s*["'`]([^"'`]+\.js)["'`]/g;

/** Entry script + modulepreload closure of an HTML page, as emitted hrefs. */
const pageEntries = (html) =>
  [...readFileSync(path.join(outDir, html), 'utf8').matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((match) => match[1]);

/** Transitive closure of chunk paths (relative to `outDir`) reachable from the given hrefs. */
const reachable = (hrefs) => {
  const seen = new Set();
  const queue = hrefs.map((href) => href.replace(/^\//, ''));
  while (queue.length > 0) {
    const chunk = queue.pop();
    if (seen.has(chunk) || !existsSync(path.join(outDir, chunk))) {
      continue;
    }
    seen.add(chunk);
    const source = readFileSync(path.join(outDir, chunk), 'utf8');
    for (const [, specifier] of source.matchAll(SPECIFIER)) {
      queue.push(
        specifier.startsWith('.')
          ? path.normalize(path.join(path.dirname(chunk), specifier))
          : specifier.replace(/^\//, ''),
      );
    }
  }
  return seen;
};

if (!existsSync(path.join(outDir, 'index.html'))) {
  console.error(
    `ERROR: no index.html under ${path.relative(appDir, outDir)}.\n` +
      'Run `moon run composer-app:bundle-production` first.',
  );
  process.exit(1);
}

const chunks = reachable(pageEntries('index.html'));

// `sources` entries are relative to the map file, so the repo-root prefix varies; the `plugins/`
// parent is the stable part. Platform variants (`plugin.node.ts`, `plugin.workerd.ts`) count too —
// none of them belongs in a browser bundle, and matching them makes a mis-resolved condition visible.
const BODY_MODULE = /(?:^|\/)plugins\/(plugin-[a-z0-9-]+)\/src\/plugin(?:\.[a-z]+)?\.tsx?$/;

// `<plugin-name>` -> the reachable chunks whose sourcemap names its body module.
const found = new Map();
const shippedSeen = new Set();
let maps = 0;
for (const chunk of chunks) {
  const mapFile = path.join(outDir, `${chunk}.map`);
  if (!existsSync(mapFile)) {
    continue;
  }
  maps++;
  const { sources = [] } = JSON.parse(readFileSync(mapFile, 'utf8'));
  for (const source of sources) {
    const match = source.match(BODY_MODULE);
    if (!match) {
      continue;
    }
    const name = match[1];
    if (shipped.has(name)) {
      shippedSeen.add(name);
      continue;
    }
    const chunksForName = found.get(name) ?? new Set();
    chunksForName.add(path.basename(chunk));
    found.set(name, chunksForName);
  }
}

console.log(
  `plugin set: ${shipped.size} of ${allPlugins.length} plugin packages shipped; ` +
    `${chunks.size} chunks reachable from index.html (${maps} mapped), ` +
    `${shippedSeen.size}/${shipped.size} shipped bodies seen, ${found.size} unexpected`,
);

// Fail closed. Every shipped plugin is a `Plugin.lazy` stub whose body rolldown emits as its own
// chunk, reached by a dynamic import from the app graph — so all of them must show up here. A missing
// one means the walk under-approximates (an import form `SPECIFIER` does not match, a chunk-naming
// change) and "0 unexpected" would be the walk seeing nothing rather than the invariant holding.
const missing = [...shipped].filter((name) => !shippedSeen.has(name)).sort();
if (missing.length > 0) {
  console.error(
    `ERROR: ${missing.length} shipped plugin body/bodies not found in the reachable graph, so this\n` +
      `check proved nothing: ${missing.join(', ')}\n` +
      'Either the import-specifier walk (`SPECIFIER`) misses a form rolldown now emits, or those\n' +
      'plugins stopped being reached from `index.html` at all. Fix the walk before trusting a pass.',
  );
  process.exit(1);
}

if (found.size === 0) {
  process.exit(0);
}

for (const [name, chunksForName] of [...found].sort()) {
  console.error(`  ${name}  (${[...chunksForName].sort().join(', ')})`);
}
console.error(
  `\nERROR: ${found.size} plugin(s) outside the production set reached the app bundle.\n` +
    'Either the plugin is imported from something the set does reach — trace it back and import the\n' +
    'narrow module instead of the plugin — or `DX_PLUGIN_SET=production` did not take effect for this\n' +
    'build, in which case the `./plugin-defs` alias in vite.config.ts is the place to look.',
);
process.exit(1);
