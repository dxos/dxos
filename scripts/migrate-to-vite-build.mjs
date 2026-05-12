#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Migrates a ts-build-tagged package to ts-vite-build:
//   - Reads `--entryPoint=` args from moon.yml `compile` task
//   - Creates a per-package vite.config.ts with the matching entry map
//   - Rewrites package.json `exports` to single ESM (./dist/lib/<name>.mjs)
//   - Swaps the `ts-build` tag for `ts-vite-build` in moon.yml
//   - Deletes any standalone vitest.config.ts (vite.config.ts is dual-duty)
//
// Skips packages with bundle/inject args — those keep the esbuild path.
//
// Usage:
//   node scripts/migrate-to-vite-build.mjs <packageDir> [<packageDir> ...]
//   node scripts/migrate-to-vite-build.mjs --all-simple
//

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Only flags that the new vite/rolldown pipeline genuinely can't reproduce:
//   - bundlePackage: inlines a third-party CJS/wasm dep into the output
//   - alias / moduleFormat / mainFields: rewrite esbuild resolution in ways that
//     don't map onto a vite library build
// `--platform=browser` / `--platform=node` / `--injectGlobals` / `--importGlobals`
// are intentionally allowed: the vite build emits a single ESM bundle and leaves
// node polyfills/globals to the consuming app, which is the modern shape.
const BUNDLE_FLAGS = /bundlePackage|alias|moduleFormat|mainFields/;

/** Derive an entry name from a source path: `src/hooks/index.ts` → `hooks`, `src/index.ts` → `index`. */
const entryNameFromPath = (srcPath) => {
  const noSrc = srcPath.replace(/^src\//, '');
  const noExt = noSrc.replace(/\.tsx?$/, '');
  return noExt.replace(/\/index$/, '') || 'index';
};

const parseEntryPoints = (moonYmlText) => {
  // Crude but sufficient: pull `'--entryPoint=src/...'` lines from the file.
  const lines = moonYmlText.split('\n');
  const entries = [];
  for (const line of lines) {
    const match = line.match(/^\s*-\s*'?--entryPoint=([^'\s]+)'?\s*$/);
    if (match) entries.push(match[1]);
  }
  return entries;
};

/** Rewrite moon.yml: swap `ts-build` → `ts-vite-build`, drop the `compile` task block. */
const rewriteMoonYml = (text) => {
  const lines = text.split('\n');
  const out = [];
  let inCompileTask = false;
  let compileIndent = -1;
  let pendingComments = []; // comments at task-level that may belong to the dropped `compile` task

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (inCompileTask) {
      if (trimmed === '' || indent > compileIndent) {
        continue;
      }
      inCompileTask = false;
    }

    // Detect `compile:` task header. Match any indentation so this works regardless of how `tasks:`
    // is nested (or even if the file's tasks live at top level without a `tasks:` parent).
    if (/^\s+compile:\s*$/.test(line)) {
      inCompileTask = true;
      compileIndent = indent;
      pendingComments = []; // drop any comments that immediately preceded `compile:`
      continue;
    }

    // Buffer task-level comments — if the only remaining task was `compile`, we'll drop them too.
    if (trimmed.startsWith('#')) {
      pendingComments.push(line);
      continue;
    }

    // Swap `- ts-build` → `- ts-vite-build`.
    if (/^\s*-\s+ts-build\s*$/.test(line)) {
      if (pendingComments.length) {
        out.push(...pendingComments);
        pendingComments = [];
      }
      out.push(line.replace('ts-build', 'ts-vite-build'));
      continue;
    }

    if (pendingComments.length) {
      out.push(...pendingComments);
      pendingComments = [];
    }
    out.push(line);
  }

  let result = out.join('\n');
  // If `tasks:` has no remaining children, drop it.
  result = result.replace(/^tasks:\s*(?:\n|$)/m, (match, offset, str) => {
    const after = str.slice(offset + match.length);
    if (after.trim() === '' || /^[^ \t]/.test(after)) return '';
    return match;
  });
  return result.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
};

const buildEntryRecord = (entryPoints) => {
  if (entryPoints.length === 0) return undefined;
  if (entryPoints.length === 1 && entryPoints[0] === 'src/index.ts') return undefined; // default
  const record = {};
  for (const ep of entryPoints) {
    record[entryNameFromPath(ep)] = ep;
  }
  return record;
};

const buildViteConfig = (pkgDir, entryPoints, hasTests, jsx, testEnvOverride, extras = {}) => {
  const { browser = false, storybook = false } = extras;
  const relToRoot = relative(pkgDir, REPO_ROOT) || '.';
  const baseImport = `${relToRoot}/vite.base.config.ts`;
  const entryRecord = buildEntryRecord(entryPoints);
  const optionsBits = [];
  if (entryRecord) {
    const entryStr = JSON.stringify(entryRecord, null, 2)
      .split('\n')
      .map((line, idx) => (idx === 0 ? line : '  ' + line))
      .join('\n');
    optionsBits.push(`  entry: ${entryStr},`);
  }
  if (jsx) {
    optionsBits.push(`  jsx: '${jsx}',`);
  }
  if (hasTests) {
    // JSX packages need a DOM (component rendering); non-JSX packages with explicit
    // `happy-dom` / `jsdom` setups in their previous vitest.config get the same;
    // everything else defaults to plain node.
    const env = testEnvOverride ?? (jsx ? 'happy-dom' : undefined);
    const testParts = [];
    testParts.push(env ? `node: { environment: '${env}' }` : `node: true`);
    if (browser) testParts.push(`browser: 'chromium'`);
    if (storybook) testParts.push(`storybook: true`);
    optionsBits.push(`  test: { ${testParts.join(', ')} },`);
  }

  const body = optionsBits.length
    ? `import { defineConfig } from '${baseImport}';\n\nexport default defineConfig({\n${optionsBits.join('\n')}\n});\n`
    : `import { defineConfig } from '${baseImport}';\n\nexport default defineConfig();\n`;

  return `//\n// Copyright 2026 DXOS.org\n//\n\n${body}`;
};

/** Rewrite package.json `exports` to single ESM per entry. */
const rewriteExports = (pkgJson, entryPoints) => {
  const oldExports = pkgJson.exports ?? {};
  const newExports = {};
  // Map entry name (e.g. "playwright") → source path ("src/playwright.ts" or "src/playwright/index.ts").
  // Determines the .d.ts location: tsgo mirrors the src layout, so `src/playwright.ts` →
  // `dist/types/src/playwright.d.ts`, `src/playwright/index.ts` → `dist/types/src/playwright/index.d.ts`.
  const entrySourceByName = new Map();
  for (const ep of entryPoints.length === 0 ? ['src/index.ts'] : entryPoints) {
    entrySourceByName.set(entryNameFromPath(ep), ep);
  }
  // For exports like `./icons` whose `source` condition points to a deeper file
  // (e.g. `./src/components/IconPicker/icons.ts`), match by source path rather
  // than by export-key name.
  const entryNameBySourcePath = new Map();
  for (const [name, source] of entrySourceByName) {
    entryNameBySourcePath.set(source.replace(/^\.\//, ''), name);
  }

  for (const key of Object.keys(oldExports)) {
    const oldValue = oldExports[key];
    // Try matching by export-key name first.
    let name = key === '.' ? 'index' : key.replace(/^\.\//, '');
    let source = entrySourceByName.get(name);
    // If that fails, fall back to the `source` condition in the old export entry.
    if (!source && oldValue && typeof oldValue === 'object' && typeof oldValue.source === 'string') {
      const srcRel = oldValue.source.replace(/^\.\//, '');
      const matchedName = entryNameBySourcePath.get(srcRel);
      if (matchedName) {
        name = matchedName;
        source = entrySourceByName.get(matchedName);
      }
    }
    if (!source) {
      // Preserve unknown export keys verbatim (e.g. ./package.json).
      newExports[key] = oldValue;
      continue;
    }
    const typesPath = source.replace(/^src\//, 'dist/types/src/').replace(/\.tsx?$/, '.d.ts');
    newExports[key] = {
      types: `./${typesPath}`,
      import: `./dist/lib/${name}.mjs`,
    };
  }

  pkgJson.exports = newExports;
  return pkgJson;
};

/**
 * Rewrite leaf paths in package.json `imports` from the legacy
 * `./dist/lib/{browser,node,node-esm,node-cjs}/<rest>(/index)?.mjs|.cjs`
 * layout to the single-bundle `./dist/lib/<rest>.mjs` layout.
 *
 * Types paths and `source` conditions are preserved verbatim. Returns the set
 * of additional entry names that must be present in the vite entry record so
 * the `imports` field's output paths exist on disk.
 */
const rewriteImports = (pkgJson) => {
  const required = new Set();
  const visit = (node) => {
    if (typeof node === 'string') {
      const m = node.match(
        /^\.\/dist\/lib\/(?:browser|node|node-esm|node-cjs|neutral)\/(.+?)(?:\/index)?\.(?:mjs|cjs)$/,
      );
      if (m) {
        const entry = m[1];
        required.add(entry);
        return `./dist/lib/${entry}.mjs`;
      }
      return node;
    }
    if (node && typeof node === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        if (k === 'source' || k === 'types' || k === 'typings') {
          // `source` points to .ts; `types` to .d.ts — both stay as-is.
          out[k] = v;
        } else {
          out[k] = visit(v);
        }
      }
      return out;
    }
    return node;
  };

  if (pkgJson.imports) {
    pkgJson.imports = visit(pkgJson.imports);
  }
  return required;
};

const migrate = (pkgRel) => {
  const pkgDir = resolve(REPO_ROOT, pkgRel);
  const moonPath = resolve(pkgDir, 'moon.yml');
  const pkgJsonPath = resolve(pkgDir, 'package.json');
  const vitestConfigPath = resolve(pkgDir, 'vitest.config.ts');
  const viteConfigPath = resolve(pkgDir, 'vite.config.ts');

  if (!existsSync(moonPath) || !existsSync(pkgJsonPath)) {
    console.warn(`SKIP ${pkgRel}: missing moon.yml or package.json`);
    return;
  }

  const moonText = readFileSync(moonPath, 'utf8');
  if (BUNDLE_FLAGS.test(moonText)) {
    console.warn(`SKIP ${pkgRel}: contains bundle/inject flags`);
    return;
  }

  // Skip packages whose moon.yml overrides `compile`'s `command:` (e.g. a custom
  // `bun ./scripts/build.ts`) — those are bespoke build pipelines that the migration
  // script can't safely translate.
  if (/^\s+compile:\s*$\n(?:\s+(?!command:)\S.*\n)*\s+command:/m.test(moonText)) {
    console.warn(`SKIP ${pkgRel}: compile task has custom command`);
    return;
  }

  // Skip applications (layer: application) — they're consumers, not libraries.
  if (/^layer:\s*application\b/m.test(moonText)) {
    console.warn(`SKIP ${pkgRel}: layer is application`);
    return;
  }

  // Skip packages that use vite-specific worker patterns. Vite/rolldown's built-in
  // `vite:worker-import-meta-url` plugin tries to bundle the referenced source as a
  // separate worker chunk — which fails for libraries that consume WASM or other
  // assets from the worker. These packages stay on the esbuild flow until we have a
  // proper worker-externalization strategy.
  const srcDir = resolve(pkgDir, 'src');
  if (existsSync(srcDir)) {
    const usesWorker = execSync(
      `grep -rEl "new (Shared)?Worker\\(new URL\\(|import\\.meta\\.url.*new URL" "${srcDir}" 2>/dev/null || true`,
      { encoding: 'utf8' },
    ).trim();
    if (usesWorker) {
      console.warn(`SKIP ${pkgRel}: uses worker/import.meta.url URL patterns`);
      return;
    }
  }

  // Skip packages where the default entry (src/index.ts) doesn't exist and no
  // `--entryPoint=` is declared.
  if (!existsSync(resolve(pkgDir, 'src/index.ts')) && !/--entryPoint=/.test(moonText)) {
    console.warn(`SKIP ${pkgRel}: no src/index.ts and no explicit --entryPoint`);
    return;
  }
  const alreadyMigrated = /^\s*-\s+ts-vite-build\s*$/m.test(moonText);
  if (!alreadyMigrated && !/^\s*-\s+ts-build\s*$/m.test(moonText)) {
    console.warn(`SKIP ${pkgRel}: not tagged ts-build or ts-vite-build`);
    return;
  }

  const entryPoints = parseEntryPoints(moonText);
  // Pull additional entries out of the existing package.json `exports` and `imports`.
  // Necessary when main added a new sub-path export (e.g. `./types`) but the local
  // moon.yml + vite.config.ts haven't picked it up yet (post-merge state).
  {
    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    const addCandidate = (rel) => {
      if (existsSync(resolve(pkgDir, rel)) && !entryPoints.includes(rel)) {
        entryPoints.push(rel);
      }
    };
    const collect = (node) => {
      if (typeof node === 'string') {
        // `./src/x.ts` — direct source reference.
        if (/^\.\/src\/.+\.tsx?$/.test(node)) {
          addCandidate(node.replace(/^\.\//, ''));
          return;
        }
        // `./dist/types/src/x/y.d.ts` — types path mirrors the src layout.
        const tm = node.match(/^\.\/dist\/types\/src\/(.+)\.d\.ts$/);
        if (tm) {
          const rel = tm[1];
          for (const c of [`src/${rel}.ts`, `src/${rel}.tsx`, `src/${rel}/index.ts`, `src/${rel}/index.tsx`]) {
            if (existsSync(resolve(pkgDir, c))) {
              addCandidate(c);
              break;
            }
          }
        }
      } else if (node && typeof node === 'object') {
        for (const v of Object.values(node)) collect(v);
      }
    };
    collect(pkg.exports);
    collect(pkg.imports);
    // Infer from export-key names: `./testing` → `src/testing.ts` or `src/testing/index.ts`.
    for (const key of Object.keys(pkg.exports ?? {})) {
      if (key === '.' || key === './package.json') continue;
      const name = key.replace(/^\.\//, '');
      for (const candidate of [`src/${name}.ts`, `src/${name}.tsx`, `src/${name}/index.ts`, `src/${name}/index.tsx`]) {
        if (existsSync(resolve(pkgDir, candidate))) {
          addCandidate(candidate);
          break;
        }
      }
    }
    // Always include src/index.ts when present.
    if (existsSync(resolve(pkgDir, 'src/index.ts'))) {
      addCandidate('src/index.ts');
    } else if (existsSync(resolve(pkgDir, 'src/index.tsx'))) {
      addCandidate('src/index.tsx');
    }
  }
  if (entryPoints.length === 0 && alreadyMigrated && existsSync(viteConfigPath)) {
    // Re-running on a migrated package: recover entries from the existing vite.config.ts
    // (moon.yml no longer carries the `--entryPoint=` args).
    const existing = readFileSync(viteConfigPath, 'utf8');
    const entryBlock = existing.match(/entry:\s*\{([\s\S]*?)\}/);
    if (entryBlock) {
      for (const m of entryBlock[1].matchAll(/(?:['"]([^'"]+)['"]|(\w[\w-]*))\s*:\s*['"]([^'"]+)['"]/g)) {
        entryPoints.push(m[3]);
      }
    }
  }
  if (entryPoints.length === 0) {
    // No entryPoints declared — assume default src/index.ts (matches dx-compile behavior).
    entryPoints.push('src/index.ts');
  }

  const hasTests = /\bts-test\b/.test(moonText);
  const hasBrowserTests = /\bts-test-browser\b/.test(moonText);
  const hasStorybookTests = /\bts-test-storybook\b/.test(moonText);

  // Preserve a `happy-dom` / `jsdom` environment if the existing vitest.config.ts
  // (or vite.config.ts on a re-run) sets one. Non-JSX packages can still need a
  // DOM at test time (e.g. @dxos/web-context uses `CustomEvent` / `document`
  // directly). When no config picks it up but the test sources clearly touch the
  // DOM, default to `happy-dom`.
  let testEnvOverride;
  for (const candidate of [vitestConfigPath, viteConfigPath]) {
    if (existsSync(candidate)) {
      const existing = readFileSync(candidate, 'utf8');
      const m = existing.match(/environment:\s*['"]([^'"]+)['"]/);
      if (m && (m[1] === 'happy-dom' || m[1] === 'jsdom')) {
        testEnvOverride = m[1];
        break;
      }
    }
  }
  if (!testEnvOverride && hasTests && existsSync(srcDir)) {
    const usesDom = execSync(
      `grep -rEl "\\b(document|window|HTMLElement|CustomEvent|navigator)\\b" "${srcDir}" --include='*.test.ts' --include='*.test.tsx' 2>/dev/null || true`,
      { encoding: 'utf8' },
    ).trim();
    if (usesDom) {
      testEnvOverride = 'happy-dom';
    }
  }

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));

  // Auto-detect JSX runtime from declared deps (incl. peer deps for libraries).
  const allDeps = {
    ...(pkgJson.dependencies ?? {}),
    ...(pkgJson.devDependencies ?? {}),
    ...(pkgJson.peerDependencies ?? {}),
  };
  let jsx;
  if ('solid-js' in allDeps) {
    // Solid packages need vite-plugin-solid in BOTH the build and the vitest node
    // project for tests to pass. vitest.base.config.ts's createNodeProject currently
    // only wires `@vitejs/plugin-react`, so Solid JSX hits the React transform and
    // tests crash with "Client-only API called on the server side". Skip these
    // until createNodeProject grows a `solid` knob.
    console.warn(`SKIP ${pkgRel}: solid-js package — needs vitest-side solid plugin support`);
    return;
  } else if ('react' in allDeps || 'react-dom' in allDeps) {
    jsx = 'react';
  }

  const newMoon = rewriteMoonYml(moonText);
  writeFileSync(moonPath, newMoon);

  rewriteExports(pkgJson, entryPoints);
  const importEntries = rewriteImports(pkgJson);
  writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');

  // Ensure every entry the `imports` field now references has a matching
  // source file in the vite entry record. The script reads source paths from
  // the `source` condition when available; otherwise it falls back to
  // `src/<entry>.ts` or `src/<entry>/index.ts`.
  const entryNames = new Set(entryPoints.map(entryNameFromPath));
  for (const required of importEntries) {
    if (entryNames.has(required)) continue;
    const candidates = [`src/${required}.ts`, `src/${required}/index.ts`];
    const found = candidates.find((c) => existsSync(resolve(pkgDir, c)));
    if (!found) {
      console.warn(`  warn: ${pkgRel}: imports references "${required}" but no source file found`);
      continue;
    }
    entryPoints.push(found);
    entryNames.add(required);
  }

  writeFileSync(
    viteConfigPath,
    buildViteConfig(pkgDir, entryPoints, hasTests, jsx, testEnvOverride, {
      browser: hasBrowserTests,
      storybook: hasStorybookTests,
    }),
  );

  if (existsSync(vitestConfigPath)) {
    rmSync(vitestConfigPath);
  }

  console.log(`OK   ${pkgRel}: ${entryPoints.length} entry${entryPoints.length === 1 ? '' : 's'}`);
};

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: migrate-to-vite-build.mjs <packageDir> ...');
  process.exit(1);
}

let targets = [];
if (args[0] === '--all-simple') {
  const out = execSync(
    `for f in $(find packages -name moon.yml); do if grep -qE "ts-(vite-)?build" "$f" && ! grep -qE "bundlePackage|alias|moduleFormat|mainFields" "$f"; then dirname "$f"; fi; done`,
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  targets = out.split('\n').filter(Boolean);
} else {
  targets = args;
}

console.log(`Migrating ${targets.length} package(s)`);
for (const t of targets) {
  migrate(t);
}
