#!/usr/bin/env node
// Part 2 — prototype generator. Given a plugin's canonical `capabilities/index.ts` and the
// {node, workerd} module-name annotations (derived here from the matrix built by `audit.mjs` —
// in the real system these would be authored inline as `environments: [...]` on the maker call),
// AST-slices `index.ts` into `capabilities/node.gen.ts` / `capabilities/workerd.gen.ts`:
//   - modules flagged for the env are emitted as their exact original `export const Name = ...;`
//     statement (maker call, spec, loader, attached leading comment — verbatim).
//   - modules referenced by *some* other env's entry (i.e. known capabilities) but not this one
//     are stubbed as `export const Name = undefined;` (the convention `Plugin.addModule` already
//     understands, per the concurrent app-framework spike found on this branch: `addModule`
//     treats `undefined` as a no-op).
//   - everything else (plain re-exported helpers, types) is left out of the per-env barrels
//     entirely — matching what every hand-written node.ts/workerd.ts in the repo actually does.
//   - only the `import` statements actually referenced by the included statements are kept,
//     resolved per-statement against the file it was sliced from (handles `export * from` /
//     `export { X } from` indirection, e.g. plugin-space's `AppGraphBuilder`).

import fs from 'node:fs';
import path from 'node:path';

import { parseBarrel } from './lib/barrel.mjs';
import { refModuleNames } from './lib/entry.mjs';
import { parseFile, topLevelImportDeclarations, collectFreeIdentifiers } from './lib/ts-util.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO_PLUGINS = '/home/user/dxos/packages/plugins';

// ---------------------------------------------------------------------------------------------
// Targets. All four are read from frozen `git show <rev>:...` snapshots under ./pristine-*
// (scratchpad copies, never repo files) rather than the live checkout: a *second*, concurrent
// session shares this exact worktree and branch and is actively applying this same
// single-entry/undefined-stub redesign to plugins live during this run — it had already landed a
// commit rewriting plugin-markdown, and (as of this script's last run) had plugin-space
// mid-edit and uncommitted. Freezing snapshots at a fixed revision keeps this generator run
// internally consistent instead of racing a moving target. See generation-report.md for the
// exact revisions and a pointer to the live diffs.
// ---------------------------------------------------------------------------------------------
const TARGETS = [
  { plugin: 'plugin-markdown', root: path.join(HERE, 'pristine-plugin-markdown') }, // pre-5549ee98 (parent commit)
  { plugin: 'plugin-space', root: path.join(HERE, 'pristine-plugin-space') }, // git HEAD (5549ee98) — pre the in-progress uncommitted edit
  { plugin: 'plugin-thread', root: path.join(HERE, 'pristine-plugin-thread') }, // git HEAD, unaffected
  { plugin: 'plugin-inbox', root: path.join(HERE, 'pristine-plugin-inbox') }, // git HEAD, unaffected
];

const OUT_ROOT = path.join(HERE, 'generated');

const findFirst = (dir, names) => names.map((n) => path.join(dir, n)).find((p) => fs.existsSync(p)) ?? null;

const generateOne = ({ plugin, root }) => {
  const srcDir = path.join(root, 'src');
  const indexPath = findFirst(srcDir, ['capabilities/index.ts', 'capabilities/index.tsx']);
  if (!indexPath) throw new Error(`${plugin}: no capabilities/index.ts under ${srcDir}`);

  const entryFiles = {
    browser: findFirst(srcDir, ['plugin.ts', 'plugin.tsx']),
    node: findFirst(srcDir, ['plugin.node.ts', 'plugin.node.tsx']),
    workerd: findFirst(srcDir, ['plugin.workerd.ts', 'plugin.workerd.tsx']),
  };

  const refs = { browser: new Set(), node: new Set(), workerd: new Set() };
  for (const env of ['browser', 'node', 'workerd']) {
    if (entryFiles[env]) refs[env] = refModuleNames(parseFile(entryFiles[env]));
  }
  const knownModules = new Set([...refs.browser, ...refs.node, ...refs.workerd]);

  const members = parseBarrel(indexPath); // name -> {statementText, sourceFile, calleeText, argsText, kind}
  const memberOrder = [...members.keys()];

  const report = { plugin, indexPath, entryFiles, unresolvedRefs: {}, generatedFiles: {} };

  for (const env of ['node', 'workerd']) {
    if (!entryFiles[env]) continue; // nothing to generate — no entry for this env at all

    const unresolved = [...refs[env]].filter((name) => !members.has(name));
    if (unresolved.length) report.unresolvedRefs[env] = unresolved;

    const includedNames = memberOrder.filter((name) => knownModules.has(name) && refs[env].has(name));
    const stubNames = memberOrder.filter((name) => knownModules.has(name) && !refs[env].has(name)).sort();

    // ---- import selection: per statement's *origin* file (handles cross-file re-exports) -----
    const importCache = new Map(); // origin file path -> topLevelImportDeclarations(...)
    const importsForOrigin = (originPath) => {
      if (!importCache.has(originPath)) importCache.set(originPath, topLevelImportDeclarations(parseFile(originPath)));
      return importCache.get(originPath);
    };
    const selectedImportTexts = new Set();
    for (const name of includedNames) {
      const member = members.get(name);
      const free = collectFreeIdentifiers(member.statementText);
      for (const decl of importsForOrigin(member.sourceFile)) {
        if ([...decl.boundNames].some((n) => free.has(n))) selectedImportTexts.add(decl.text);
      }
    }

    const lines = [];
    lines.push('//');
    lines.push('// GENERATED — do not edit');
    lines.push(`// AST-sliced from ${path.relative(root, indexPath)} for the '${env}' environment.`);
    lines.push('//');
    lines.push('');
    if (selectedImportTexts.size) {
      lines.push(...[...selectedImportTexts].sort(), '');
    }
    for (const name of includedNames) {
      lines.push(members.get(name).statementText, '');
    }
    for (const name of stubNames) {
      lines.push(`export const ${name} = undefined;`);
    }
    const text =
      lines
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd() + '\n';

    const outDir = path.join(OUT_ROOT, plugin, 'capabilities');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${env}.gen.ts`);
    fs.writeFileSync(outPath, text);
    report.generatedFiles[env] = { outPath, includedCount: includedNames.length, stubCount: stubNames.length };
  }

  return report;
};

const reports = TARGETS.map(generateOne);
fs.mkdirSync(OUT_ROOT, { recursive: true });
fs.writeFileSync(path.join(OUT_ROOT, 'generation-report.json'), JSON.stringify(reports, null, 2));

for (const r of reports) {
  console.log(`\n${r.plugin}`);
  for (const [env, info] of Object.entries(r.generatedFiles)) {
    console.log(`  ${env}: ${info.includedCount} included, ${info.stubCount} stubbed -> ${info.outPath}`);
  }
  for (const [env, names] of Object.entries(r.unresolvedRefs)) {
    console.log(`  UNRESOLVED (${env}): entry references not exported by index.ts: ${names.join(', ')}`);
  }
}
