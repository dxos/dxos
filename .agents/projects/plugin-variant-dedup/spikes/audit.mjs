#!/usr/bin/env node
// Part 1 — reverse-engineers the implied {browser,node,workerd} capability matrix for every
// DXOS plugin that hand-maintains per-environment `plugin.*` / `capabilities/*` variants, and
// flags drift between what the `plugin.*` entry files register and what the resolved
// `#capabilities` barrel for that environment actually exports.
//
// Usage: node audit.mjs [--plugins-root DIR] [--out-json FILE] [--out-md FILE]

import fs from 'node:fs';
import path from 'node:path';

import { parseBarrel } from './lib/barrel.mjs';
import { classifyEntryModules } from './lib/entry.mjs';
import { parseFile, readPackageImports, resolveConditionalImport } from './lib/ts-util.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};

const PLUGINS_ROOT = flag('--plugins-root', '/home/user/dxos/packages/plugins');
const OUT_JSON = flag('--out-json', new URL('./matrix.json', import.meta.url).pathname);
const OUT_MD = flag('--out-md', new URL('./matrix.md', import.meta.url).pathname);

// ---------------------------------------------------------------------------------------------
// Discovery: a plugin is in scope if it hand-maintains a node/workerd variant of either the
// `plugin.*` entry file or the `capabilities/*` barrel.
// ---------------------------------------------------------------------------------------------

const findFirst = (dir, names) => names.map((n) => path.join(dir, n)).find((p) => fs.existsSync(p)) ?? null;

const discoverPlugins = () => {
  const dirs = fs
    .readdirSync(PLUGINS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('plugin-'))
    .map((d) => d.name);

  const inScope = [];
  for (const name of dirs) {
    const pluginDir = path.join(PLUGINS_ROOT, name);
    const srcDir = path.join(pluginDir, 'src');
    if (!fs.existsSync(srcDir)) continue;
    const hasEntryVariant =
      findFirst(srcDir, ['plugin.node.ts', 'plugin.node.tsx']) ||
      findFirst(srcDir, ['plugin.workerd.ts', 'plugin.workerd.tsx']);
    const hasBarrelVariant =
      fs.existsSync(path.join(srcDir, 'capabilities', 'node.ts')) ||
      fs.existsSync(path.join(srcDir, 'capabilities', 'workerd.ts'));
    if (hasEntryVariant || hasBarrelVariant) {
      inScope.push({ name, pluginDir, srcDir });
    }
  }
  return inScope.sort((a, b) => a.name.localeCompare(b.name));
};

// ---------------------------------------------------------------------------------------------
// Per-plugin analysis
// ---------------------------------------------------------------------------------------------

const ENVS = ['browser', 'node', 'workerd'];

const analyzePlugin = ({ name, pluginDir, srcDir }) => {
  const entryFiles = {
    browser: findFirst(srcDir, ['plugin.ts', 'plugin.tsx']),
    node: findFirst(srcDir, ['plugin.node.ts', 'plugin.node.tsx']),
    workerd: findFirst(srcDir, ['plugin.workerd.ts', 'plugin.workerd.tsx']),
  };

  const barrelFilesOnDisk = {
    browser: findFirst(srcDir, ['capabilities/index.ts', 'capabilities/index.tsx']),
    node: findFirst(srcDir, ['capabilities/node.ts', 'capabilities/node.tsx']),
    workerd: findFirst(srcDir, ['capabilities/workerd.ts', 'capabilities/workerd.tsx']),
  };

  const importsMap = readPackageImports(pluginDir);
  const capabilitiesResolution = resolveConditionalImport(pluginDir, importsMap, '#capabilities');
  const pluginResolution = resolveConditionalImport(pluginDir, importsMap, '#plugin');

  // What #capabilities actually resolves to per env (may differ from barrelFilesOnDisk if the
  // plugin never wired the condition, even though the file exists on disk — that's an
  // ORPHANED_VARIANT_FILE case).
  const resolvedBarrelPath = {
    browser: capabilitiesResolution.browser,
    node: capabilitiesResolution.node,
    workerd: capabilitiesResolution.workerd,
  };

  const barrelCache = new Map();
  const parseBarrelCached = (filePath) => {
    if (!filePath) return new Map();
    if (!barrelCache.has(filePath)) barrelCache.set(filePath, parseBarrel(filePath));
    return barrelCache.get(filePath);
  };

  const barrels = {
    browser: parseBarrelCached(barrelFilesOnDisk.browser),
    node: parseBarrelCached(barrelFilesOnDisk.node),
    workerd: parseBarrelCached(barrelFilesOnDisk.workerd),
  };
  const resolvedBarrels = {
    browser: parseBarrelCached(resolvedBarrelPath.browser),
    node: parseBarrelCached(resolvedBarrelPath.node),
    workerd: parseBarrelCached(resolvedBarrelPath.workerd),
  };

  // `local alias -> barrel export name` per env entry file, so e.g. plugin-assistant's
  // `import { AiContext as AiContextCapability } from '#capabilities'` resolves the addModule
  // call site (which only ever sees `AiContextCapability`) back to the barrel's real `AiContext`,
  // and locally-declared inline modules (plugin-devtools' `const X = Capability.inlineModule(...)`)
  // are excluded rather than compared against a barrel they were never imported from.
  const entryModules = { browser: [], node: [], workerd: [] };
  for (const env of ENVS) {
    const file = entryFiles[env];
    if (!file) continue;
    entryModules[env] = classifyEntryModules(parseFile(file));
  }

  // ---- module matrix -------------------------------------------------------------------------
  const refNames = new Set();
  for (const env of ENVS) {
    for (const m of entryModules[env]) if (m.kind === 'ref') refNames.add(m.name);
  }
  for (const env of ENVS) for (const n of barrels[env].keys()) refNames.add(n);

  const modules = {};
  for (const modName of [...refNames].sort()) {
    const entriesPresence = {};
    for (const env of ENVS) {
      entriesPresence[env] = entryFiles[env]
        ? entryModules[env].some((m) => m.kind === 'ref' && m.name === modName)
        : null;
    }
    const barrelPresence = {};
    const barrelSpec = {};
    for (const env of ENVS) {
      barrelPresence[env] = barrelFilesOnDisk[env] ? barrels[env].has(modName) : null;
      const spec = barrels[env].get(modName);
      barrelSpec[env] = spec
        ? { calleeText: spec.calleeText, argsText: normalizeWs(spec.argsText), kind: spec.kind, via: spec.via ?? null }
        : null;
    }

    const flags = [];

    // (a) entry references a module whose *resolved* barrel for that env lacks the export.
    for (const env of ENVS) {
      if (!entriesPresence[env]) continue;
      const resolved = resolvedBarrels[env];
      if (!resolved.has(modName)) {
        flags.push({
          type: 'ENTRY_REFS_MODULE_NOT_IN_RESOLVED_BARREL',
          env,
          detail: `plugin.${env === 'browser' ? '' : env + '.'}ts references '${modName}' but the barrel #capabilities resolves to for '${env}' (${relOrNull(resolvedBarrelPath[env])}) does not export it`,
        });
      } else if (barrelFilesOnDisk[env] && !barrelPresence[env] && env !== 'browser') {
        // Dedicated barrel file exists on disk for this env, but the entry's reference is only
        // satisfied via fallthrough to a *different* resolved barrel (e.g. #capabilities has no
        // node/workerd condition even though capabilities/node.ts exists) — surfaced separately
        // below as ORPHANED_VARIANT_FILE at the plugin level; nothing to flag per-module here.
      }
    }

    // (c) spec drift: same name exported by >=2 *on-disk* barrels with a different maker/args.
    // An `export const X = undefined;` stub (the headless-barrel "excluded module" convention)
    // is a deliberate exclusion, not drift — only flag when *both* sides carry a real spec.
    const isUndefinedStub = (spec) => spec && spec.calleeText === null && spec.argsText === 'undefined';
    const specced = ENVS.filter((env) => barrelSpec[env]);
    for (let i = 0; i < specced.length; i++) {
      for (let j = i + 1; j < specced.length; j++) {
        const a = barrelSpec[specced[i]];
        const b = barrelSpec[specced[j]];
        if (a.calleeText === b.calleeText && a.argsText === b.argsText) continue;
        if (isUndefinedStub(a) || isUndefinedStub(b)) {
          flags.push({
            type: 'EXCLUDED_VIA_UNDEFINED_STUB',
            envs: [specced[i], specced[j]],
            detail: `'${modName}': stubbed \`undefined\` in ${isUndefinedStub(a) ? specced[i] : specced[j]} (deliberate exclusion, not drift)`,
          });
          continue;
        }
        flags.push({
          type: 'SPEC_DRIFT_BETWEEN_BARRELS',
          envs: [specced[i], specced[j]],
          detail: `'${modName}': ${specced[i]} uses ${a.calleeText}(${truncate(a.argsText)}) vs ${specced[j]} uses ${b.calleeText}(${truncate(b.argsText)})`,
        });
      }
    }

    modules[modName] = { entries: entriesPresence, barrels: barrelPresence, barrelSpec, flags };
  }

  // ---- plugin-level flags ----------------------------------------------------------------------
  const pluginFlags = [];

  // Orphaned variant files: exists on disk but package.json condition doesn't route to it.
  for (const env of ['node', 'workerd']) {
    if (barrelFilesOnDisk[env] && resolvedBarrelPath[env] !== barrelFilesOnDisk[env]) {
      pluginFlags.push({
        type: 'ORPHANED_BARREL_VARIANT',
        env,
        detail: `capabilities/${env}.ts exists on disk but #capabilities' '${env}' condition resolves to ${relOrNull(resolvedBarrelPath[env])}`,
      });
    }
    if (entryFiles[env] && pluginResolution[env] && pluginResolution[env] !== entryFiles[env]) {
      pluginFlags.push({
        type: 'ORPHANED_ENTRY_VARIANT',
        env,
        detail: `plugin.${env}.ts exists on disk but #plugin's '${env}' condition resolves to ${relOrNull(pluginResolution[env])}`,
      });
    }
  }

  // (b) byte-identical node/workerd files.
  const identicalPairs = [];
  const cmpBytes = (aPath, bPath) =>
    aPath && bPath && fs.readFileSync(aPath, 'utf8') === fs.readFileSync(bPath, 'utf8');
  if (cmpBytes(entryFiles.node, entryFiles.workerd)) {
    identicalPairs.push({ kind: 'entry', a: relOrNull(entryFiles.node), b: relOrNull(entryFiles.workerd) });
  }
  if (cmpBytes(barrelFilesOnDisk.node, barrelFilesOnDisk.workerd)) {
    identicalPairs.push({
      kind: 'barrel',
      a: relOrNull(barrelFilesOnDisk.node),
      b: relOrNull(barrelFilesOnDisk.workerd),
    });
  }
  for (const p of identicalPairs) {
    pluginFlags.push({
      type: 'BYTE_IDENTICAL_NODE_WORKERD',
      kind: p.kind,
      detail: `${p.a} is byte-identical to ${p.b}`,
    });
  }

  // Inline pseudo-modules per env (translations/pluginAsset/schema/etc passed directly to
  // Plugin.addModule rather than through #capabilities) — recorded for visibility, not scored
  // into the drift flags above since they have no barrel counterpart to diff against.
  const inlineModules = {};
  for (const env of ENVS) {
    inlineModules[env] = entryModules[env]
      .filter((m) => m.kind !== 'ref')
      .map((m) => ({
        name: m.name,
        kind: m.kind,
        calleeText: m.calleeText ?? null,
        argsText: m.argsText ? normalizeWs(m.argsText) : null,
        line: m.line,
      }));
  }

  const isRealMismatch = (f) => f.type !== 'EXCLUDED_VIA_UNDEFINED_STUB';
  const mismatchCount =
    Object.values(modules).reduce((sum, m) => sum + m.flags.filter(isRealMismatch).length, 0) + pluginFlags.length;
  const stubExclusionCount = Object.values(modules).reduce(
    (sum, m) => sum + m.flags.filter((f) => f.type === 'EXCLUDED_VIA_UNDEFINED_STUB').length,
    0,
  );

  return {
    name,
    files: {
      entries: mapRel(entryFiles),
      barrelsOnDisk: mapRel(barrelFilesOnDisk),
      resolvedBarrels: mapRel(resolvedBarrelPath),
    },
    hasDedicated: {
      node: Boolean(capabilitiesResolution.hasDedicatedNode),
      workerd: Boolean(capabilitiesResolution.hasDedicatedWorkerd),
      pluginNode: Boolean(pluginResolution.hasDedicatedNode),
      pluginWorkerd: Boolean(pluginResolution.hasDedicatedWorkerd),
    },
    modules,
    inlineModules,
    pluginFlags,
    mismatchCount,
    stubExclusionCount,
  };
};

const relOrNull = (p) => (p ? path.relative(PLUGINS_ROOT, p) : null);
const mapRel = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, relOrNull(v)]));
const normalizeWs = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
const truncate = (s, n = 80) => (s.length > n ? s.slice(0, n) + '…' : s);

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

const plugins = discoverPlugins();
const results = plugins.map(analyzePlugin);

const totalMismatches = results.reduce((sum, r) => sum + r.mismatchCount, 0);
const worstOffenders = [...results]
  .sort((a, b) => b.mismatchCount - a.mismatchCount)
  .filter((r) => r.mismatchCount > 0);

const matrix = {
  generatedAt: new Date().toISOString(),
  pluginsRoot: PLUGINS_ROOT,
  pluginCount: results.length,
  totalMismatchFlags: totalMismatches,
  plugins: results,
};

fs.writeFileSync(OUT_JSON, JSON.stringify(matrix, null, 2));
console.log(`wrote ${OUT_JSON}`);

// ---------------------------------------------------------------------------------------------
// Markdown summary
// ---------------------------------------------------------------------------------------------

const md = [];
md.push(`# Capability environment matrix — drift audit`);
md.push('');
md.push(
  `Generated ${matrix.generatedAt}. ${results.length} plugins in scope (hand-maintain a node/workerd \`plugin.*\` or \`capabilities/*\` variant). Total mismatch flags: **${totalMismatches}**.`,
);
md.push('');
md.push(`## Worst offenders`);
md.push('');
md.push('| plugin | mismatch flags |');
md.push('|---|---|');
for (const r of worstOffenders.slice(0, 15)) md.push(`| ${r.name} | ${r.mismatchCount} |`);
if (worstOffenders.length === 0) md.push('| _none_ | 0 |');
md.push('');

md.push(`## Byte-identical node/workerd file pairs`);
md.push('');
const identicalRows = results.flatMap((r) =>
  r.pluginFlags
    .filter((f) => f.type === 'BYTE_IDENTICAL_NODE_WORKERD')
    .map((f) => `| ${r.name} | ${f.kind} | ${f.detail} |`),
);
md.push('| plugin | kind | detail |');
md.push('|---|---|---|');
md.push(...(identicalRows.length ? identicalRows : ['| _none_ | | |']));
md.push('');

md.push(`## Orphaned variant files (on disk, not wired via package.json conditions)`);
md.push('');
const orphanRows = results.flatMap((r) =>
  r.pluginFlags.filter((f) => f.type.startsWith('ORPHANED')).map((f) => `| ${r.name} | ${f.type} | ${f.detail} |`),
);
md.push('| plugin | type | detail |');
md.push('|---|---|---|');
md.push(...(orphanRows.length ? orphanRows : ['| _none_ | | |']));
md.push('');

md.push(`## Per-plugin detail`);
const b3 = (v) => (v === true ? 'Y' : v === false ? '.' : '-');
const hasAnyTrue = (obj) => Object.values(obj).some((v) => v === true);
for (const r of results) {
  md.push('');
  md.push(`### ${r.name} (${r.mismatchCount} flags)`);
  md.push('');
  md.push(
    `Entries: browser=\`${r.files.entries.browser}\` node=\`${r.files.entries.node}\` workerd=\`${r.files.entries.workerd}\``,
  );
  md.push(
    `Barrels on disk: browser=\`${r.files.barrelsOnDisk.browser}\` node=\`${r.files.barrelsOnDisk.node}\` workerd=\`${r.files.barrelsOnDisk.workerd}\``,
  );
  md.push('');
  md.push('| module | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |');
  md.push('|---|---|---|---|---|');
  for (const [name, m] of Object.entries(r.modules)) {
    const cell = (env) => `${b3(m.entries[env])}/${b3(m.barrels[env])}`;
    const flagText = m.flags.map((f) => f.type).join(', ');
    if (m.flags.length === 0 && !hasAnyTrue(m.entries) && !hasAnyTrue(m.barrels)) continue;
    md.push(`| ${name} | ${cell('browser')} | ${cell('node')} | ${cell('workerd')} | ${flagText} |`);
  }
  if (r.pluginFlags.length) {
    md.push('');
    md.push('Plugin-level flags:');
    for (const f of r.pluginFlags) md.push(`- **${f.type}**: ${f.detail}`);
  }
}

fs.writeFileSync(OUT_MD, md.join('\n') + '\n');
console.log(`wrote ${OUT_MD}`);
console.log(`plugins analyzed: ${results.length}, total mismatch flags: ${totalMismatches}`);
