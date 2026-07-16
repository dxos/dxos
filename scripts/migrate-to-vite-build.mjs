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

/**
 * Rewrite moon.yml: swap `ts-build` → `ts-vite-build`, drop the `compile` task block,
 * and inject a `build` override that re-declares the dropped compile-task deps
 * (e.g. `prebuild`, `glsl`, `gen-pieces`) so the new build still waits on them.
 */
const rewriteMoonYml = (text, buildExtraDeps = []) => {
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
  if (buildExtraDeps.length > 0) {
    const buildBlock =
      `tasks:\n  # Sibling prebuild/codegen tasks the old compile depended on.\n  build:\n    deps:\n` +
      buildExtraDeps.map((d) => `      - ${d}`).join('\n') +
      `\n`;
    // Merge into existing `tasks:` block if present, otherwise append.
    if (/^tasks:\s*$/m.test(result)) {
      result = result.replace(
        /^tasks:\s*$\n/m,
        (m) => m + `  build:\n    deps:\n` + buildExtraDeps.map((d) => `      - ${d}`).join('\n') + '\n',
      );
    } else {
      result = result.trimEnd() + '\n\n' + buildBlock;
    }
  }
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
  const { browser = false, storybook = false, assetsAsFiles = false } = extras;
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
  if (assetsAsFiles) {
    optionsBits.push(`  assetsAsFiles: true,`);
  }
  if (hasTests) {
    // Only opt into a DOM-y env when the previous vitest.config (local or origin/main)
    // explicitly asked for one. JSX packages don't automatically get happy-dom —
    // libraries like @dxos/introspect render JSX statically and use `import.meta.url`
    // in tests, which happy-dom turns into an http:// URL and crashes `fileURLToPath`.
    const env = testEnvOverride;
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
    // Prefer the original `source` condition — it points to the actual entry file.
    // Falls back to key-name matching for exports that lacked a `source` condition on main.
    let name = null;
    let source = null;
    if (oldValue && typeof oldValue === 'object' && typeof oldValue.source === 'string') {
      const srcRel = oldValue.source.replace(/^\.\//, '');
      const matchedName = entryNameBySourcePath.get(srcRel);
      if (matchedName) {
        name = matchedName;
        source = entrySourceByName.get(matchedName);
      }
    }
    if (!source) {
      name = key === '.' ? 'index' : key.replace(/^\.\//, '');
      source = entrySourceByName.get(name);
    }
    if (!source) {
      // Preserve unknown export keys verbatim (e.g. ./package.json).
      newExports[key] = oldValue;
      continue;
    }
    const typesPath = source.replace(/^src\//, 'dist/types/src/').replace(/\.tsx?$/, '.d.ts');
    newExports[key] = {
      // `source` lets @dxos/vite-plugin-import-source redirect `@dxos/<pkg>/<subpath>` to
      // the matching `src/*.ts` during dev/test. Critical when a package consumes its
      // own sub-exports (e.g. `@dxos/react-ui/testing` imports `@dxos/react-ui`); without
      // it the storybook tests pick up the compiled bundle's ThemeContext while the
      // story components keep the src-version, producing "Missing ThemeContext".
      source: `./${source}`,
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

  // Walk lines to extract the body of the `compile:` task without picking up siblings.
  // Skip packages whose `compile:` declares its own `command:` (a custom build script
  // we can't translate). Packages whose `compile:` is just `args:` + `deps:` migrate;
  // siblings like `prebuild` / `glsl` / `e2e` survive the rewrite and the new `build`
  // gets the same prebuild deps re-attached below.
  const compileBody = [];
  let compileIndentChars;
  {
    const lines = moonText.split('\n');
    let inCompile = false;
    for (const line of lines) {
      const m = line.match(/^(\s+)compile:\s*$/);
      if (m && !inCompile) {
        inCompile = true;
        compileIndentChars = m[1];
        continue;
      }
      if (inCompile) {
        const indent = line.match(/^(\s*)/)[1];
        if (line.trim() === '' || indent.length > compileIndentChars.length) {
          compileBody.push(line);
        } else {
          break;
        }
      }
    }
  }
  const compileBodyText = compileBody.join('\n');
  if (/^\s+command:/m.test(compileBodyText)) {
    console.warn(`SKIP ${pkgRel}: compile task has custom command`);
    return;
  }
  // Carry over the compile task's local deps (e.g. `prebuild`, `glsl`).
  const compileTaskDeps = [];
  {
    const depsMatch = compileBodyText.match(/^\s+deps:\s*\n((?:\s+-\s+\S.*\n?)+)/m);
    if (depsMatch) {
      for (const line of depsMatch[1].split('\n')) {
        const m = line.match(/^\s+-\s+(\S+)\s*$/);
        // Keep package-local task refs only (e.g. `prebuild`, `glsl`). Skip the
        // workspace-level chain (`^:build`, `~:compile`) since tag-ts-vite-build.yml
        // already provides those.
        if (m && !/^[\^~]:/.test(m[1])) {
          compileTaskDeps.push(m[1]);
        }
      }
    }
  }

  // Skip applications (layer: application) — they're consumers, not libraries.
  if (/^layer:\s*application\b/m.test(moonText)) {
    console.warn(`SKIP ${pkgRel}: layer is application`);
    return;
  }

  // Skip packages tagged `vite` (they have a bespoke app-style bundle config —
  // e.g. `@dxos/shell` with its `dist/bundle/` output). Their existing
  // vite.config.ts is hand-crafted and must not be overwritten.
  if (/^\s*-\s+vite\s*$/m.test(moonText)) {
    console.warn(`SKIP ${pkgRel}: tagged 'vite' (bespoke bundle/app config)`);
    return;
  }

  // Skip packages with a pre-existing bespoke vite.config.ts (imports `defineConfig`
  // from `vite` directly rather than from our workspace base config). These carry
  // custom plugin chains (ThemePlugin, VitePWA, fonts, etc.) that must not be lost.
  if (existsSync(viteConfigPath)) {
    const existing = readFileSync(viteConfigPath, 'utf8');
    const importsFromBase = /from\s+['"](?:\.\.\/)+vite\.base\.config\.ts['"]/.test(existing);
    if (!importsFromBase) {
      console.warn(`SKIP ${pkgRel}: pre-existing bespoke vite.config.ts`);
      return;
    }
  }

  // Skip packages that use vite-specific worker patterns. Vite/rolldown's built-in
  // `vite:worker-import-meta-url` plugin tries to bundle the referenced source as a
  // separate worker chunk — which fails for libraries that consume WASM or other
  const srcDir = resolve(pkgDir, 'src');
  let hasRawAssetImports = false;
  if (existsSync(srcDir)) {
    // `?url` / `?raw` / `?inline` asset imports — let the base config emit them as
    // separate files instead of base64-inlining them into the JS bundle.
    hasRawAssetImports = !!execSync(
      `grep -rEl "from ['\\\"][^'\\\"]+\\?(url|raw|inline)['\\\"]" "${srcDir}" 2>/dev/null || true`,
      { encoding: 'utf8' },
    ).trim();
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
      if (!existsSync(resolve(pkgDir, rel))) return;
      if (entryPoints.includes(rel)) return;
      // Skip when another candidate already produces the same entryName — inferring
      // `src/testing/index.ts` alongside a moon.yml-declared `src/testing.ts` would
      // silently overwrite the primary entry in the vite entry map (last-write-wins).
      const name = entryNameFromPath(rel);
      if (entryPoints.some((ep) => entryNameFromPath(ep) === name)) return;
      entryPoints.push(rel);
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
    // Skip keys that already declare a valid `source` condition pointing to a `.ts` file —
    // the key-name candidate can shadow the real entry (e.g. `@dxos/echo-host/query` has
    // `source: ./src/query/planner.ts` on main; inferring `src/query/index.ts` from the key
    // adds a bogus entry that then wins in `rewriteExports`).
    for (const key of Object.keys(pkg.exports ?? {})) {
      if (key === '.' || key === './package.json') continue;
      const oldValue = pkg.exports[key];
      const hasSource =
        oldValue &&
        typeof oldValue === 'object' &&
        typeof oldValue.source === 'string' &&
        /^\.\/src\/.+\.tsx?$/.test(oldValue.source);
      if (hasSource) continue;
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

  // Packages whose `origin/main:vitest.config.ts` (or the live one, when un-migrated)
  // wires `setupFiles` or extra `plugins:` keep that vitest.config.ts and let vitest
  // discover it — vite.config.ts omits its `test:` block so vitest doesn't merge two
  // sources of truth. The setup files typically register
  // `@testing-library/jest-dom/vitest` matchers and similar customizations the
  // generator can't reproduce.
  let hasCustomVitestConfig = false;
  for (const src of [
    () => {
      try {
        return execSync(`git show "origin/main:${pkgRel}/vitest.config.ts" 2>/dev/null || true`, {
          cwd: REPO_ROOT,
          encoding: 'utf8',
        });
      } catch {
        return '';
      }
    },
    () => (existsSync(vitestConfigPath) ? readFileSync(vitestConfigPath, 'utf8') : ''),
  ]) {
    const t = src();
    if (t && /\bsetupFiles\s*:|\bplugins\s*:\s*\[\s*[A-Za-z@]/.test(t)) {
      hasCustomVitestConfig = true;
      break;
    }
  }

  // Preserve a `happy-dom` / `jsdom` environment if either:
  //   (a) the local vitest.config.ts (still present on un-migrated packages) declared one
  //   (b) the same file existed on origin/main with one declared — needed on re-runs of
  //       packages whose vitest.config.ts the migration already deleted
  // The grep-based DOM heuristic is unreliable: identifiers like `document` collide with
  // automerge's `document` variable (echo-pipeline) and trip false positives that put
  // happy-dom on tests that hit real localhost services — happy-dom's CORS policy
  // blocks those requests.
  let testEnvOverride;
  // origin/main is the authoritative source. We deliberately ignore an existing
  // local vite.config.ts because earlier passes of this script may have written a
  // stale env into it (the previous `jsx ? 'happy-dom'` heuristic), and re-reading
  // it would re-propagate the mistake.
  try {
    const fromMain = execSync(`git show "origin/main:${pkgRel}/vitest.config.ts" 2>/dev/null || true`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    const m = fromMain.match(/environment:\s*['"]([^'"]+)['"]/);
    if (m && (m[1] === 'happy-dom' || m[1] === 'jsdom')) {
      testEnvOverride = m[1];
    }
  } catch {}
  if (!testEnvOverride && existsSync(vitestConfigPath)) {
    // Un-migrated package — read the live local vitest.config.ts.
    const m = readFileSync(vitestConfigPath, 'utf8').match(/environment:\s*['"]([^'"]+)['"]/);
    if (m && (m[1] === 'happy-dom' || m[1] === 'jsdom')) {
      testEnvOverride = m[1];
    }
  }

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));

  // Auto-detect JSX runtime from declared deps (incl. peer deps for libraries).
  const allDeps = {
    ...(pkgJson.dependencies ?? {}),
    ...(pkgJson.devDependencies ?? {}),
    ...(pkgJson.peerDependencies ?? {}),
  };
  // `jsx` flows through to both the library build (vite-plugin-solid / @vitejs/plugin-react)
  // and the vitest node project's createNodeProject(jsx). Prefer React when a package
  // has both (e.g. `@dxos/app-framework` bundles solid-js as a consumer opt-in but the
  // package's own components are React); vite-plugin-solid would transform every `.tsx`
  // and break React's JSX runtime.
  let jsx;
  if ('react' in allDeps || 'react-dom' in allDeps) {
    jsx = 'react';
  } else if ('solid-js' in allDeps) {
    jsx = 'solid';
  }

  const newMoon = rewriteMoonYml(moonText, compileTaskDeps);
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
    buildViteConfig(pkgDir, entryPoints, hasTests && !hasCustomVitestConfig, jsx, testEnvOverride, {
      browser: hasBrowserTests,
      storybook: hasStorybookTests,
      assetsAsFiles: hasRawAssetImports,
    }),
  );

  // Keep the local vitest.config.ts for packages with custom setup
  // (`setupFiles`, extra `plugins:`); restore from main when we'd already deleted it.
  if (hasCustomVitestConfig) {
    if (!existsSync(vitestConfigPath)) {
      try {
        execSync(`git checkout "origin/main" -- "${pkgRel}/vitest.config.ts"`, {
          cwd: REPO_ROOT,
          stdio: 'ignore',
        });
      } catch {}
    }
  } else if (existsSync(vitestConfigPath)) {
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
