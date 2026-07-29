//
// Copyright 2026 DXOS.org
//

import type { KnipConfig } from 'knip';
import { globSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Collect the in-repo targets of an `exports`/`imports` entry, preferring the `source`
 * condition: every other condition points into `dist`, which only exists after a build.
 */
const sourceTargets = (target: unknown): string[] => {
  if (typeof target === 'string') {
    return target.startsWith('./src/') ? [target] : [];
  }
  if (!target || typeof target !== 'object') {
    return [];
  }
  const conditions = target as Record<string, unknown>;
  const scope = 'source' in conditions ? conditions.source : conditions;
  return typeof scope === 'string' ? sourceTargets(scope) : Object.values(scope as object).flatMap(sourceTargets);
};

/** Reachable from tooling rather than from a package entry point, so knip needs them spelled out. */
const AUXILIARY_ENTRY = [
  'src/**/*.{test,spec}.{ts,tsx}',
  'src/**/*.stories.{ts,tsx}',
  'src/testing/**/*.{ts,tsx}',
  'src/playwright/**/*.{ts,tsx}',
  '*.config.{ts,mts,cts,js,mjs,cjs}',
  '.storybook/*.{ts,tsx,mts,mjs}',
  'bin/*.{ts,mts,js,mjs}',
  'scripts/**/*.{ts,mts,js,mjs}',
];

const PROJECT = [
  'src/**/*.{ts,tsx}',
  '*.{ts,mts,cts,js,mjs,cjs}',
  '.storybook/**/*.{ts,tsx,mts,mjs}',
  'bin/**/*.{ts,mts,js,mjs}',
  'scripts/**/*.{ts,mts,js,mjs}',
];

/**
 * Dependencies a workspace's build config names as bare strings rather than importing — Vite's
 * `optimizeDeps.include` and `dedupe` lists are the bulk of them. Dropping these would silently
 * regress bundling, so treat a string literal in a config file as a use.
 */
const configuredDependencies = (dir: string, names: string[]): string[] => {
  const sources = globSync([`${dir}/*.config.{ts,mts,cts,js,mjs,cjs}`, `${dir}/.storybook/*.{ts,mts,mjs}`]).map(
    (file) => readFileSync(file, 'utf8'),
  );
  return sources.length ? names.filter((name) => sources.some((source) => source.includes(`'${name}'`))) : [];
};

const workspaces: KnipConfig['workspaces'] = {
  // The root holds no package of its own; its dependencies are consumed by the shared vitest/vite
  // bases and the repo scripts.
  '.': {
    entry: ['*.{ts,mts}', 'scripts/**/*.{ts,mjs}', 'vitest/**/*.{ts,mjs}'],
    project: ['*.{ts,mts}', 'scripts/**/*.{ts,mjs}', 'vitest/**/*.{ts,mjs}'],
  },
};

for (const manifest of globSync(
  ['packages/**/package.json', 'tools/**/package.json', 'vendor/**/package.json', 'docs/package.json'],
  { exclude: (path) => path.includes('node_modules') },
)) {
  const dir = dirname(manifest);
  const {
    exports = {},
    imports = {},
    dependencies = {},
    devDependencies = {},
  } = JSON.parse(readFileSync(manifest, 'utf8'));

  // Self-referencing subpath imports (`#meta`, `#plugin`) are otherwise unresolvable: knip follows
  // the published conditions, which point at unbuilt `dist`, and then treats the importer as dead.
  const paths: Record<string, string[]> = {};
  for (const [specifier, target] of Object.entries(imports)) {
    const targets = sourceTargets(target);
    if (targets.length) {
      paths[specifier] = targets;
    }
  }

  // Libraries are reachable from their declared entry points, which is what makes unreferenced
  // files (and the dependencies only they import) detectable. Apps declare none — their entry is an
  // `index.html` knip cannot see — so treat their whole source tree as reachable instead.
  const declared = [...new Set([...Object.values(exports), ...Object.values(imports)].flatMap(sourceTargets))];

  workspaces[dir] = {
    entry: [...(declared.length ? declared : ['src/**/*.{ts,tsx}']), ...AUXILIARY_ENTRY],
    project: PROJECT,
    paths,
    ignoreDependencies: configuredDependencies(dir, Object.keys({ ...dependencies, ...devDependencies })),
  };
}

const config: KnipConfig = {
  workspaces,
  ignoreDependencies: [
    //
    '@dxos/node-std',
    '@bufbuild/buf',
    '@bufbuild/protoc-gen-es',
  ],
  // These plugins execute the config files they discover, and those import workspace packages
  // through `exports` conditions that only resolve after a build. The config files are covered
  // as ordinary entry points above, so their imports are still counted.
  storybook: false,
  vite: false,
  vitest: false,
};

export default config;
