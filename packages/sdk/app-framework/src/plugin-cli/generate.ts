//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { type BarrelMember, parseBarrel } from './barrel';
import {
  collectFreeIdentifiers,
  parseFile,
  rewriteRelativeSpecifiers,
  topLevelExportConsts,
  topLevelImportDeclarations,
} from './ts-util';

export type GenerateResult = {
  pluginDir: string;
  environments: string[];
  files: Array<{ path: string; included: number; stubbed: number; overridden: number }>;
};

const findFirst = (dir: string, names: string[]): string | null =>
  names.map((name) => path.join(dir, name)).find((candidate) => fs.existsSync(candidate)) ?? null;

const OVERRIDES_FILE_PATTERN = /^overrides\.([a-z0-9]+)\.tsx?$/;

/**
 * Conditions named by an `overrides.<env>.ts(x)` file that actually exports something: an override
 * declares that environment's implementation of a module, so it opts the plugin into the condition
 * exactly as an `environments` annotation does. An override file exporting nothing names no
 * condition — a plugin that contributes nothing to a runtime simply generates no variant for it,
 * and headless hosts leave such a plugin out of their plugin list.
 */
const overrideEnvironments = (capabilitiesDir: string): string[] => {
  const entries = fs.existsSync(capabilitiesDir) ? fs.readdirSync(capabilitiesDir) : [];
  return entries.flatMap((entry) => {
    const env = OVERRIDES_FILE_PATTERN.exec(entry)?.[1];
    if (!env) {
      return [];
    }
    const source = parseFile(path.join(capabilitiesDir, entry));
    return source && topLevelExportConsts(source).length > 0 ? [env] : [];
  });
};

/**
 * Generates the per-condition capability barrels for one plugin package:
 * `src/capabilities/gen/<env>.ts` for every condition named by an `environments` annotation in
 * the canonical barrel (or by an `overrides.<env>.ts`), plus the matching `#capabilities`
 * condition map in package.json.
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
  const environments = [
    ...new Set([
      ...moduleMembers.flatMap((member) => member.environments ?? []),
      ...overrideEnvironments(capabilitiesDir),
    ]),
  ].sort();

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
    const overridesPath = findFirst(capabilitiesDir, [`overrides.${env}.ts`, `overrides.${env}.tsx`]);
    const overrideNames = new Set<string>();
    if (overridesPath) {
      const overridesSource = parseFile(overridesPath);
      for (const entry of topLevelExportConsts(overridesSource!)) {
        overrideNames.add(entry.name);
      }
    }

    const included = moduleMembers.filter(
      (member) => !overrideNames.has(member.name) && (member.environments ?? []).includes(env),
    );
    const stubbed = moduleMembers.filter(
      (member) => !overrideNames.has(member.name) && !(member.environments ?? []).includes(env),
    );

    const text = renderBarrel({ env, genDir, included, stubbed, overridesPath, overrideNames });
    const outPath = path.join(genDir, `${env}.ts`);
    fs.writeFileSync(outPath, text);
    result.files.push({
      path: outPath,
      included: included.length,
      stubbed: stubbed.length,
      overridden: overrideNames.size,
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
  overridesPath: string | null;
  overrideNames: Set<string>;
};

const renderBarrel = ({ env, genDir, included, stubbed, overridesPath, overrideNames }: RenderOptions): string => {
  // Imports selected per included statement against the file the statement was sliced from, so
  // cross-file re-exports resolve their own imports; specifiers re-based into gen/.
  const importTexts = new Set<string>();
  const importCache = new Map<string, ReturnType<typeof topLevelImportDeclarations>>();
  for (const member of included) {
    const free = collectFreeIdentifiers(member.statementText);
    if (!importCache.has(member.sourceFile)) {
      importCache.set(member.sourceFile, topLevelImportDeclarations(parseFile(member.sourceFile)!));
    }
    for (const decl of importCache.get(member.sourceFile)!) {
      if ([...decl.boundNames].some((name) => free.has(name))) {
        importTexts.add(rewriteRelativeSpecifiers(decl.text, path.dirname(member.sourceFile), genDir));
      }
    }
  }

  const lines: string[] = [
    '//',
    '// Copyright 2026 DXOS.org',
    '//',
    '',
    `// GENERATED by dx-plugin — do not edit. Sliced from ../index.ts for the '${env}'`,
    '// condition: modules flagged for it keep their exact declarations, the rest are stubbed as',
    '// `undefined` (skipped by `Plugin.addModule`), so the canonical plugin entry serves every',
    '// runtime while this barrel keeps the excluded modules out of the static module graph.',
    '',
  ];
  if (importTexts.size > 0) {
    lines.push(...sortImports([...importTexts]), '');
  }
  if (overridesPath && overrideNames.size > 0) {
    const overridesSpec = `../${path.basename(overridesPath).replace(/\.tsx?$/, '')}`;
    lines.push(`export { ${[...overrideNames].sort().join(', ')} } from '${overridesSpec}';`, '');
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
  for (const env of envOrder) {
    entry[env] = `./dist/lib/capabilities.${env}.mjs`;
  }
  entry.default = existing?.default ?? './dist/lib/capabilities.mjs';

  pkg.imports = { ...pkg.imports, '#capabilities': entry };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
};
