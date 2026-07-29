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

const workspaces: KnipConfig['workspaces'] = {};

for (const manifest of globSync(['packages/**/package.json', 'tools/**/package.json', 'vendor/**/package.json'], {
  exclude: (path) => path.includes('node_modules'),
})) {
  const { exports = {}, imports = {} } = JSON.parse(readFileSync(manifest, 'utf8'));

  // Self-referencing subpath imports (`#meta`, `#plugin`) are otherwise unresolvable: knip follows
  // the published conditions, which point at unbuilt `dist`, and then treats the importer as dead.
  const paths: Record<string, string[]> = {};
  for (const [specifier, target] of Object.entries(imports)) {
    const targets = sourceTargets(target);
    if (targets.length) {
      paths[specifier] = targets;
    }
  }

  workspaces[dirname(manifest)] = {
    entry: [
      ...new Set([...Object.values(exports), ...Object.values(imports)].flatMap(sourceTargets)),
      ...AUXILIARY_ENTRY,
    ],
    project: PROJECT,
    paths,
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
