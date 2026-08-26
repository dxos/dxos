//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { type BarrelMember, parseBarrel } from './barrel';
import {
  collectFreeIdentifiers,
  parseFile,
  rebaseSpecifier,
  rewriteRelativeSpecifiers,
  topLevelImportDeclarations,
  topLevelLocalDeclarations,
} from './ts-util';

export type GenerateResult = {
  pluginDir: string;
  environments: string[];
  files: Array<{ path: string; included: number; stubbed: number; values: number }>;
};

const findFirst = (dir: string, names: string[]): string | null =>
  names.map((name) => path.join(dir, name)).find((candidate) => fs.existsSync(candidate)) ?? null;

/**
 * Generates the per-condition capability barrels for one plugin package:
 * `src/capabilities/gen/<env>.ts` for every condition named by an `environments` annotation in
 * the canonical barrel, plus the matching `#capabilities` condition map in package.json.
 *
 * A plugin whose modules name no conditions generates nothing and keeps an unconditioned
 * `#capabilities`: the canonical barrel IS the `default` condition, so there is no variant to
 * split out.
 */
export const generate = (pluginDir: string): GenerateResult => {
  const capabilitiesDir = path.join(pluginDir, 'src/capabilities');
  const indexPath = findFirst(capabilitiesDir, ['index.ts', 'index.tsx']);
  if (!indexPath) {
    throw new Error(`no capabilities barrel found at ${capabilitiesDir}/index.ts`);
  }

  const members = parseBarrel(indexPath);
  const moduleMembers = [...members.values()].filter((member) => member.kind === 'maker-call');
  const valueMembers = [...members.values()].filter((member) => member.kind === 'non-call-initializer');
  const environments = [...new Set(moduleMembers.flatMap((member) => member.environments ?? []))].sort();

  const genDir = path.join(capabilitiesDir, 'gen');
  const result: GenerateResult = { pluginDir, environments, files: [] };
  if (environments.length === 0) {
    // Still sync: dropping the last annotation has to retract the conditions too, or package.json
    // keeps pointing `#capabilities` at gen files that are no longer produced.
    fs.rmSync(genDir, { recursive: true, force: true });
    syncPackageImports(pluginDir, environments);
    return result;
  }
  fs.mkdirSync(genDir, { recursive: true });

  for (const env of environments) {
    const carries = (member: BarrelMember) => member.environments === null || member.environments.includes(env);
    const modules = moduleMembers.filter(carries);
    const included = [...valueMembers, ...modules];
    const stubbed = moduleMembers.filter((member) => !carries(member));

    const text = renderBarrel({ env, genDir, included, stubbed });
    const outPath = path.join(genDir, `${env}.ts`);
    fs.writeFileSync(outPath, text);
    result.files.push({
      path: outPath,
      included: modules.length,
      stubbed: stubbed.length,
      values: valueMembers.length,
    });
  }

  syncPackageImports(pluginDir, environments);
  return result;
};

type RenderOptions = {
  env: string;
  genDir: string;
  included: BarrelMember[];
  stubbed: BarrelMember[];
};

const renderBarrel = ({ env, genDir, included, stubbed }: RenderOptions): string => {
  type Merged = { isTypeOnly: boolean; defaultName: string | null; namespaceName: string | null; named: Set<string> };
  const bySpecifier = new Map<string, Merged>();
  const importCache = new Map<string, ReturnType<typeof topLevelImportDeclarations>>();
  for (const member of included) {
    const free = collectFreeIdentifiers(member.statementText);
    if (!importCache.has(member.sourceFile)) {
      importCache.set(member.sourceFile, topLevelImportDeclarations(parseFile(member.sourceFile)!));
    }
    for (const decl of importCache.get(member.sourceFile)!) {
      if (![...decl.boundNames].some((name) => free.has(name))) {
        continue;
      }
      const spec = rebaseSpecifier(decl.specifier, path.dirname(member.sourceFile), genDir);
      const existing = bySpecifier.get(spec) ?? {
        isTypeOnly: decl.isTypeOnly,
        defaultName: null,
        namespaceName: null,
        named: new Set<string>(),
      };
      existing.isTypeOnly = existing.isTypeOnly && decl.isTypeOnly;
      existing.defaultName ??= decl.defaultName;
      existing.namespaceName ??= decl.namespaceName;
      for (const name of decl.named) {
        existing.named.add(name);
      }
      bySpecifier.set(spec, existing);
    }
  }

  const locals: Array<{ sourceFile: string; name: string; text: string }> = [];
  const localCache = new Map<string, ReturnType<typeof topLevelLocalDeclarations>>();
  for (const member of included) {
    if (!localCache.has(member.sourceFile)) {
      localCache.set(member.sourceFile, topLevelLocalDeclarations(parseFile(member.sourceFile)!));
    }
    const available = localCache.get(member.sourceFile)!;
    const taken = new Set(locals.filter((local) => local.sourceFile === member.sourceFile).map((l) => l.name));
    const pending = [...collectFreeIdentifiers(member.statementText)];
    while (pending.length > 0) {
      const name = pending.pop()!;
      if (taken.has(name)) {
        continue;
      }
      const decl = available.find((candidate) => candidate.name === name);
      if (!decl) {
        continue;
      }
      taken.add(name);
      locals.push({ sourceFile: member.sourceFile, name, text: decl.text });
      pending.push(...collectFreeIdentifiers(decl.text));
    }
  }

  for (const local of locals) {
    const free = collectFreeIdentifiers(local.text);
    for (const decl of importCache.get(local.sourceFile) ?? []) {
      if (![...decl.boundNames].some((name) => free.has(name))) {
        continue;
      }
      const spec = rebaseSpecifier(decl.specifier, path.dirname(local.sourceFile), genDir);
      const existing = bySpecifier.get(spec) ?? {
        isTypeOnly: decl.isTypeOnly,
        defaultName: null,
        namespaceName: null,
        named: new Set<string>(),
      };
      existing.isTypeOnly = existing.isTypeOnly && decl.isTypeOnly;
      existing.defaultName ??= decl.defaultName;
      existing.namespaceName ??= decl.namespaceName;
      for (const name of decl.named) {
        existing.named.add(name);
      }
      bySpecifier.set(spec, existing);
    }
  }

  const importTexts = new Set<string>();
  for (const [spec, merged] of bySpecifier) {
    const prefix = merged.isTypeOnly ? 'import type' : 'import';
    if (merged.namespaceName) {
      importTexts.add(`${prefix} * as ${merged.namespaceName} from '${spec}';`);
    }
    const clause = [merged.defaultName, merged.named.size > 0 ? `{ ${[...merged.named].sort().join(', ')} }` : null]
      .filter(Boolean)
      .join(', ');
    if (clause) {
      importTexts.add(`${prefix} ${clause} from '${spec}';`);
    }
  }

  const lines: string[] = [
    '//',
    '// Copyright 2026 DXOS.org',
    '//',
    '',
    `// GENERATED by dx-plugin — do not edit. Sliced from ../index.ts for the '${env}' condition.`,
    '',
  ];
  if (importTexts.size > 0) {
    lines.push(...sortImports([...importTexts]), '');
  }
  for (const local of locals) {
    lines.push(rewriteRelativeSpecifiers(local.text, path.dirname(local.sourceFile), genDir), '');
  }
  for (const member of included) {
    lines.push(rewriteRelativeSpecifiers(member.statementText, path.dirname(member.sourceFile), genDir), '');
  }
  for (const member of [...stubbed].sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`export const ${member.name} = undefined;`);
  }
  return (
    lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  );
};

/** Sort import statements into the repo's groups: external, @dxos, `#` internal, relative. */
const sortImports = (imports: string[]): string[] => {
  const specifier = (text: string): string => /from\s+['"]([^'"]+)['"]/.exec(text)?.[1] ?? text;
  const group = (spec: string): number =>
    spec.startsWith('#') ? 2 : spec.startsWith('.') ? 3 : spec.startsWith('@dxos/') ? 1 : 0;
  const sorted = [...imports].sort((a, b) => {
    const specA = specifier(a);
    const specB = specifier(b);
    return group(specA) - group(specB) || specA.localeCompare(specB);
  });
  const out: string[] = [];
  let lastGroup: number | null = null;
  for (const text of sorted) {
    const currentGroup = group(specifier(text));
    if (lastGroup !== null && currentGroup !== lastGroup) {
      out.push('');
    }
    out.push(text);
    lastGroup = currentGroup;
  }
  return out;
};

/**
 * Where a condition's built barrel lands, derived from the package's own `default` target so the
 * manifest matches whichever build the package uses.
 *
 * Two layouts exist. `ts-vite-build` flattens each entry to `dist/lib/<name>.mjs`, so the
 * condition rides the name (`capabilities.node.mjs`). The older `ts-build` mirrors the source
 * tree under a platform slug (`dist/lib/neutral/capabilities/index.mjs`), so the condition keeps
 * the source's own shape (`.../capabilities/gen/node.mjs`). Guessing one of them for every
 * package is what left two plugins pointing at bundles their build never emits.
 */
const conditionDist = (defaultDist: string, env: string): string => {
  const dir = path.posix.dirname(defaultDist);
  return path.posix.basename(defaultDist) === 'index.mjs' ? `${dir}/gen/${env}.mjs` : `${dir}/capabilities.${env}.mjs`;
};

/**
 * Rewrites the `#capabilities` entry of the plugin's package.json so each generated environment
 * resolves the generated barrel (source condition) and its built counterpart (dist condition).
 * Key order is load-bearing: `source` first, env conditions before `default`.
 */
const syncPackageImports = (pluginDir: string, environments: string[]): void => {
  const pkgPath = path.join(pluginDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const existing = pkg.imports?.['#capabilities'];
  const existingSource = typeof existing?.source === 'object' ? existing.source : {};

  // Nothing to split and nothing already split: leave the manifest untouched. Writing an entry
  // here would invent `#capabilities` for a plugin that never declared one, and expand a
  // deliberate shorthand string into the conditional form for no reason.
  const hasConditions = Object.keys(existingSource).some((key) => key !== 'default');
  if (environments.length === 0 && !hasConditions) {
    return;
  }

  // Conditions resolve in map order; workerd before node before default matches the runtimes' own
  // condition lists (wrangler never resolves `node`). Conditions outside that pair are ordered
  // alphabetically after them — the set is open, so the tool ranks what it knows and stays stable
  // for the rest rather than refusing them.
  const RANKED = ['workerd', 'node'];
  const envOrder = [...environments].sort((a, b) => {
    const rank = (env: string) => (RANKED.indexOf(env) === -1 ? RANKED.length : RANKED.indexOf(env));
    return rank(a) - rank(b) || a.localeCompare(b);
  });

  const defaultSource =
    typeof existing?.source === 'string' ? existing.source : (existingSource.default ?? './src/capabilities/index.ts');
  const source: Record<string, string> = {};
  for (const env of envOrder) {
    source[env] = `./src/capabilities/gen/${env}.ts`;
  }
  source.default = defaultSource;

  const entry: Record<string, unknown> = {
    // With no conditions there is nothing to branch on, so the map collapses back to the plain
    // string form rather than leaving a single-key object that reads as an unfinished split.
    source: envOrder.length > 0 ? source : defaultSource,
    types: existing?.types ?? './dist/types/src/capabilities/index.d.ts',
  };
  const defaultDist = existing?.default ?? './dist/lib/capabilities.mjs';
  for (const env of envOrder) {
    entry[env] = conditionDist(defaultDist, env);
  }
  entry.default = defaultDist;

  pkg.imports = { ...pkg.imports, '#capabilities': entry };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
};
