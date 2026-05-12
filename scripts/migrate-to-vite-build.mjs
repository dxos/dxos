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

const BUNDLE_FLAGS = /bundlePackage|injectGlobals|importGlobals|alias|--platform|moduleFormat|mainFields/;

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

const buildViteConfig = (pkgDir, entryPoints, hasTests, jsx) => {
  const relToRoot = relative(pkgDir, REPO_ROOT) || '.';
  const baseImport = `${relToRoot}/vite.base.config.ts`;
  const testImport = `${relToRoot}/vitest.base.config.ts`;
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

  let body;
  if (hasTests) {
    // JSX packages typically render components and need a DOM. The base config
    // defaults to `node` env when only `node: true` is passed; for JSX packages
    // we ask for `happy-dom` so things like `document.createElement` work.
    const nodeArg = jsx ? `{ environment: 'happy-dom' }` : `true`;
    body =
      `import path from 'node:path';\n` +
      `import { fileURLToPath } from 'node:url';\n\n` +
      `import { defineConfig } from '${baseImport}';\n` +
      `import { createTestConfig } from '${testImport}';\n\n` +
      `const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));\n\n` +
      `export default defineConfig({\n` +
      optionsBits.join('\n') +
      (optionsBits.length ? '\n' : '') +
      `  test: createTestConfig({ dirname, node: ${nodeArg} }),\n` +
      `});\n`;
  } else {
    body =
      `import { defineConfig } from '${baseImport}';\n\n` +
      `export default defineConfig(${entryRecord ? `{\n${optionsBits.join('\n')}\n}` : ''});\n`;
  }

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

  for (const key of Object.keys(oldExports)) {
    const name = key === '.' ? 'index' : key.replace(/^\.\//, '');
    const source = entrySourceByName.get(name);
    if (!source) {
      // Preserve unknown export keys verbatim (e.g. ./package.json).
      newExports[key] = oldExports[key];
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
      const m = node.match(/^\.\/dist\/lib\/(?:browser|node|node-esm|node-cjs)\/(.+?)(?:\/index)?\.(?:mjs|cjs)$/);
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
  if (!/^\s*-\s+ts-build\s*$/m.test(moonText)) {
    console.warn(`SKIP ${pkgRel}: not tagged ts-build`);
    return;
  }

  const entryPoints = parseEntryPoints(moonText);
  if (entryPoints.length === 0) {
    // No entryPoints declared — assume default src/index.ts (matches dx-compile behavior).
    entryPoints.push('src/index.ts');
  }

  const hasTests = /\bts-test\b/.test(moonText);

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));

  // Auto-detect JSX runtime from declared deps (incl. peer deps for libraries).
  const allDeps = {
    ...(pkgJson.dependencies ?? {}),
    ...(pkgJson.devDependencies ?? {}),
    ...(pkgJson.peerDependencies ?? {}),
  };
  let jsx;
  if ('solid-js' in allDeps) {
    jsx = 'solid';
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

  writeFileSync(viteConfigPath, buildViteConfig(pkgDir, entryPoints, hasTests, jsx));

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
    `for f in $(find packages -name moon.yml); do if grep -qE "ts-build" "$f" && ! grep -qE "bundlePackage|injectGlobals|importGlobals|alias|--platform|moduleFormat|mainFields" "$f"; then dirname "$f"; fi; done`,
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
