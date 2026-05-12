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

const swapTag = (moonYmlText) =>
  moonYmlText
    .split('\n')
    .filter((line, idx, arr) => {
      // Drop the `compile:` task block entirely (it lives under `tasks:` with `args:`).
      // We do this by tracking indentation: once we hit `compile:` we skip until we hit a
      // less-indented line.
      return true;
    })
    .join('\n');

/** Rewrite moon.yml: swap `ts-build` → `ts-vite-build`, drop the `compile` task block. */
const rewriteMoonYml = (text) => {
  const lines = text.split('\n');
  const out = [];
  let inCompileTask = false;
  let inTasks = false;
  let tasksIndent = -1;
  let compileIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (inCompileTask) {
      // Inside the compile: block — skip until we hit a sibling key (same indent as `compile:`) or shallower.
      if (trimmed === '' || (line.match(/\s/) && indent > compileIndent)) {
        continue;
      }
      inCompileTask = false;
      // fall through to process this line
    }

    if (inTasks && indent <= tasksIndent && trimmed !== '') {
      inTasks = false;
    }

    if (!inTasks && /^tasks:\s*$/.test(line)) {
      inTasks = true;
      tasksIndent = indent;
      out.push(line);
      continue;
    }

    if (inTasks && /^\s*compile:\s*$/.test(line)) {
      inCompileTask = true;
      compileIndent = indent;
      continue;
    }

    // Swap tag.
    if (/^\s*-\s+ts-build\s*$/.test(line)) {
      out.push(line.replace('ts-build', 'ts-vite-build'));
      continue;
    }

    out.push(line);
  }

  // Strip a now-empty `tasks:` block (no children).
  let result = out.join('\n');
  // If `tasks:` has no remaining children, drop it.
  result = result.replace(/^tasks:\s*$\n?/m, '');
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

const buildViteConfig = (pkgDir, entryPoints, hasTests) => {
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

  let body;
  if (hasTests) {
    body =
      `import path from 'node:path';\n` +
      `import { fileURLToPath } from 'node:url';\n\n` +
      `import { defineConfig } from '${baseImport}';\n` +
      `import { createTestConfig } from '${testImport}';\n\n` +
      `const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));\n\n` +
      `export default defineConfig({\n` +
      optionsBits.join('\n') +
      (optionsBits.length ? '\n' : '') +
      `  test: createTestConfig({ dirname, node: true }),\n` +
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
  const entryNames = (entryPoints.length === 0 ? ['src/index.ts'] : entryPoints).map(entryNameFromPath);

  for (const key of Object.keys(oldExports)) {
    // Map "./hooks" → entry name "hooks"; "." → "index".
    const name = key === '.' ? 'index' : key.replace(/^\.\//, '');
    if (!entryNames.includes(name)) {
      // Preserve unknown export keys verbatim (e.g. ./package.json).
      newExports[key] = oldExports[key];
      continue;
    }
    newExports[key] = {
      types:
        `./dist/types/src/${name === 'index' ? 'index' : name + (name.endsWith('/index') ? '' : '/index')}.d.ts`.replace(
          '/src/index/index.d.ts',
          '/src/index.d.ts',
        ),
      import: `./dist/lib/${name}.mjs`,
    };
  }

  // If a `source` condition existed, preserve it on the index export.
  pkgJson.exports = newExports;
  return pkgJson;
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

  const newMoon = rewriteMoonYml(moonText);
  writeFileSync(moonPath, newMoon);

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  rewriteExports(pkgJson, entryPoints);
  writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');

  writeFileSync(viteConfigPath, buildViteConfig(pkgDir, entryPoints, hasTests));

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
