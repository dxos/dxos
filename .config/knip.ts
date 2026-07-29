//
// Copyright 2026 DXOS.org
//

import type { KnipConfig } from 'knip';
import { globSync, readFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';

/**
 * Collect the in-repo targets of an `exports`/`imports` entry, preferring the `source`
 * condition: every other condition points into `dist`, which only exists after a build.
 */
const sourceTargets = (target: unknown): string[] => {
  if (typeof target === 'string') {
    // Anything outside `dist` is checked in — that includes root-level compat shims a package
    // publishes alongside `src` (`./module-stub.mjs`, `./testing.js`).
    return target.startsWith('./') && !target.startsWith('./dist/') ? [target] : [];
  }
  if (!target || typeof target !== 'object') {
    return [];
  }
  const conditions = target as Record<string, unknown>;
  const scope = 'source' in conditions ? conditions.source : conditions;
  return typeof scope === 'string' ? sourceTargets(scope) : Object.values(scope as object).flatMap(sourceTargets);
};

const MODULE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

/** Collect every build-output path an `exports`/`imports` entry points at. */
const distTargets = (target: unknown): string[] => {
  if (typeof target === 'string') {
    return target.startsWith('./dist/') ? [target] : [];
  }
  if (!target || typeof target !== 'object') {
    return [];
  }
  return Object.values(target as object).flatMap(distTargets);
};

/**
 * The entry points a package publishes. Packages that predate the `source` condition point straight
 * at `dist`, so map those back through the layout the build mirrors — without it the real entry is
 * never registered and every file in the package reads as unused.
 */
const entryTargets = (target: unknown): string[] => {
  const source = sourceTargets(target).filter((path) => MODULE.test(path));
  if (source.length) {
    return source;
  }
  return distTargets(target).flatMap((path) => {
    const match = /^\.\/dist\/(?:lib\/|types\/)?(?:src\/)?(.+?)\.(?:d\.ts|[cm]?jsx?)$/.exec(path);
    return match ? [`src/${match[1]}.{ts,tsx,mts,js,mjs}`] : [];
  });
};

/** Reachable from tooling rather than from a package entry point, so knip needs them spelled out. */
const AUXILIARY_ENTRY = [
  'src/**/*.{test,spec}.{ts,tsx}',
  'src/**/*.stories.{ts,tsx}',
  'src/**/*.eval.{ts,tsx}',
  'src/testing/**/*.{ts,tsx}',
  'src/playwright/**/*.{ts,tsx}',
  'src/vitest-setup.{ts,tsx}',
  // Spawned as their own process, so nothing imports them.
  'src/**/*-subprocess.{ts,tsx}',
  // Function bodies the runtime bundles by path rather than importing.
  'src/functions/**/*.{ts,tsx}',
  '*.config.{ts,mts,cts,js,mjs,cjs}',
  '.storybook/*.{ts,tsx,mts,mjs}',
  'bin/*.{ts,mts,js,mjs}',
  'scripts/**/*.{ts,mts,js,mjs}',
];

const PROJECT = [
  'src/**/*.{ts,tsx,js,jsx,mjs,cjs}',
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
  const sources = globSync([
    `${dir}/*.config.{ts,mts,cts,js,mjs,cjs}`,
    `${dir}/.storybook/*.{ts,mts,mjs}`,
    // Ambient `declare module` shims: knip skips declaration files, so an `import ... from 'pkg'`
    // inside one is invisible to it even though the types would not resolve without the package.
    `${dir}/src/**/*.d.ts`,
  ]).map((file) => readFileSync(file, 'utf8'));
  if (!sources.length) {
    return [];
  }
  const used = names.filter((name) => sources.some((source) => source.includes(`'${name}'`)));
  // Knip credits an `@types/x` package only when `x` itself is imported, which a config or shim
  // reference does not count as.
  return [...used, ...used.map((name) => `@types/${name.replace('@', '').replace('/', '__')}`)].filter((name) =>
    names.includes(name),
  );
};

/**
 * Read a repeated `--flag=value` build argument out of a workspace's moon task definition. Packages
 * with a browser build declare their entry points and the packages bundled into them there, and
 * neither is visible in the import graph.
 */
const moonBuildArgs = (dir: string, flag: string): string[] => {
  const manifest = globSync(`${dir}/moon.yml`).map((file) => readFileSync(file, 'utf8'))[0];
  return [...(manifest ?? '').matchAll(new RegExp(`--${flag}=([^'"\\s]+)`, 'g'))].map(([, value]) => value);
};

/**
 * Dependencies a moon task runs as a command rather than imports. The command is the package's
 * `bin` name, which routinely differs from the package name (`lezer-generator` ships in
 * `@lezer/generator`), so resolve each candidate's `bin` entries to match it.
 */
const moonInvokedDependencies = (dir: string, names: string[]): string[] => {
  const tasks = globSync(`${dir}/moon.yml`).map((file) => readFileSync(file, 'utf8'))[0];
  if (!tasks) {
    return [];
  }
  return names.filter((name) => {
    if (tasks.includes(name)) {
      return true;
    }
    const manifest = globSync(`${dir}/node_modules/${name}/package.json`)[0];
    if (!manifest) {
      return false;
    }
    const { bin } = JSON.parse(readFileSync(manifest, 'utf8'));
    const commands = typeof bin === 'string' ? [basename(name)] : Object.keys(bin ?? {});
    return commands.some((command) => new RegExp(`\\b${command}\\b`).test(tasks));
  });
};

/**
 * A `--bundlePackage` is inlined into the workspace's own build, so esbuild resolves that package's
 * requires against this workspace. Its dependencies therefore have to be declared here too, even
 * though nothing in the workspace imports them.
 */
const bundledDependencies = (dir: string): string[] =>
  moonBuildArgs(dir, 'bundlePackage').flatMap((name) => {
    const manifest = globSync(`${dir}/node_modules/${name}/package.json`)[0];
    return [name, ...(manifest ? Object.keys(JSON.parse(readFileSync(manifest, 'utf8')).dependencies ?? {}) : [])];
  });

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
    files = [],
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
  const declared = [...new Set([...Object.values(exports), ...Object.values(imports)].flatMap(entryTargets))];

  // `files` ships legacy CJS compat shims (`testing.js`) that no `exports` condition names, but
  // consumers still resolve them by path.
  const published = (files as string[]).filter((path) => MODULE.test(path));

  const entry = [...declared, ...published, ...moonBuildArgs(dir, 'entryPoint')];

  workspaces[dir] = {
    entry: [...(entry.length ? entry : ['src/**/*.{ts,tsx,js,jsx,mjs,cjs}']), ...AUXILIARY_ENTRY],
    project: PROJECT,
    paths,
    ignoreDependencies: [
      ...configuredDependencies(dir, Object.keys({ ...dependencies, ...devDependencies })),
      ...moonInvokedDependencies(dir, Object.keys({ ...dependencies, ...devDependencies })),
      ...bundledDependencies(dir),
    ],
  };
}

const config: KnipConfig = {
  workspaces,
  // Knip's exit code only counts issue types marked `error`; unused files default to a warning, so
  // without this the CI gate reports regressions and still passes.
  rules: {
    files: 'error',
    dependencies: 'error',
    devDependencies: 'error',
    optionalPeerDependencies: 'error',
    unlisted: 'error',
    binaries: 'error',
    unresolved: 'error',
  },
  ignoreDependencies: [
    //
    '@dxos/node-std',
    '@bufbuild/buf',
    '@bufbuild/protoc-gen-es',
  ],
  // `require.resolve`d at runtime from the emitted bundle, so the path is relative to `dist` rather
  // than to the source file knip reads it from.
  ignoreUnresolved: [
    /^\.\.\/\.\.\/polyfills\//,
    // Bundler resource queries (`?raw`, `?url`, `?worker`) are not part of the module path.
    /\?[a-z]+$/,
  ],
  // These plugins execute the config files they discover, and those import workspace packages
  // through `exports` conditions that only resolve after a build. The config files are covered
  // as ordinary entry points above, so their imports are still counted.
  storybook: false,
  vite: false,
  vitest: false,
};

export default config;
