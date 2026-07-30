//
// Copyright 2026 DXOS.org
//

import type { KnipConfig } from 'knip';
import { globSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

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
    return source.flatMap((path) => (path.endsWith('.d.ts') ? [path, path.replace(/\.d\.ts$/, '.{js,ts}')] : [path]));
  }
  return distTargets(target).flatMap((path) => {
    const match = /^\.\/dist\/(?:lib\/|types\/)?(?:src\/)?(.+?)\.(?:d\.ts|[cm]?jsx?)$/.exec(path);
    return match ? [`src/${match[1]}.{ts,tsx,mts,js,mjs}`] : [];
  });
};

/** Reachable from tooling rather than from a package entry point, so knip needs them spelled out. */
const AUXILIARY_ENTRY = [
  'src/**/*.{test,spec}.{ts,tsx}',
  // Solid and Lit storybooks use their own suffix so the react storybook does not pick them up.
  'src/**/*.{stories,solid-stories,lit-stories}.{ts,tsx}',
  'src/**/*.eval.{ts,tsx}',
  'src/testing/**/*.{ts,tsx}',
  'src/playwright/**/*.{ts,tsx}',
  'src/vitest-setup.{ts,tsx}',
  // Spawned as their own process, so nothing imports them.
  'src/**/*-subprocess.{ts,tsx}',
  // Loaded via `new Worker(new URL('./x-worker.ts', import.meta.url))`, which knip does not follow.
  'src/**/*-worker.{ts,tsx}',
  // Function bodies the runtime bundles by path rather than importing.
  'src/functions/**/*.{ts,tsx}',
  // Ambient declarations and module augmentations: TypeScript picks these up from `include`, so
  // nothing ever imports them. Scoped to checked-in locations — a bare `**` would pull the
  // generated `dist/types` tree into the analysis.
  '*.d.ts',
  'src/**/*.d.ts',
  '.storybook/*.d.ts',
  '*.config.{ts,mts,cts,js,mjs,cjs}',
  // Deliberately blank, kept so editor tooling resolves the Tailwind config.
  'tailwind.{ts,js}',
  '.storybook/*.{ts,tsx,mts,mjs}',
  'bin/*.{ts,mts,js,mjs}',
  'src/bin/*.{ts,mts,js,mjs}',
  // Alias targets wired up in the storybook config, never imported by name.
  '.storybook/mocks/**',
  // Stand-in package trees the introspection tests read from disk.
  'src/__fixtures__/**',
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
    // Bundling smoke tests name the packages they exercise as string literals rather than
    // importing them.
    `${dir}/src/**/*.test.{ts,tsx}`,
    // Stylesheets `@import` font and preset packages that no TypeScript file ever mentions, and
    // shaders pull theirs in through a glslify `#pragma`.
    `${dir}/src/**/*.css`,
    `${dir}/src/**/*.{glsl,frag,vert}`,
  ]).map((file) => readFileSync(file, 'utf8'));
  if (!sources.length) {
    return [];
  }
  // A CSS `@import` names a file inside the package, so match the subpath form as well. Fontsource
  // packages are additionally referenced only by the family they provide (`@fontsource/poiret-one`
  // supplies `'Poiret One'`), which no import statement mentions.
  const family = (name: string) => name.replace(/^@fontsource(-variable)?\//, '').replace(/-/g, ' ');
  const used = names.filter((name) =>
    sources.some(
      (source) =>
        source.includes(`'${name}'`) ||
        source.includes(`'${name}/`) ||
        (name.startsWith('@fontsource') && new RegExp(family(name), 'i').test(source)),
    ),
  );
  // Knip credits an `@types/x` package only when `x` itself is imported, which a config or shim
  // reference does not count as.
  return [...used, ...used.map((name) => `@types/${name.replace('@', '').replace('/', '__')}`)].filter((name) =>
    names.includes(name),
  );
};

/**
 * Files a build config points at by path rather than importing — vite `resolve.alias` replacements
 * are the common case. The alias target is a real module that would otherwise read as unreferenced.
 */
const configuredEntry = (dir: string): string[] => {
  const sources = globSync(`${dir}/*.config.{ts,mts,cts,js,mjs,cjs}`).map((file) => readFileSync(file, 'utf8'));
  const referenced = sources.flatMap((source) => [...source.matchAll(/'([\w./-]+\.(?:mjs|cjs|jsx?|tsx?))'/g)]);
  return [...new Set(referenced.map(([, path]) => path.replace(/^\.\//, '')))].filter(
    (path) => !path.startsWith('.') && globSync(`${dir}/${path}`).length > 0,
  );
};

/**
 * Files the package resolves by name at runtime rather than importing — `ThemePlugin` reads its
 * injected dark-mode script this way. Deleting one breaks the build only when a bundler runs.
 */
const pathResolvedEntry = (dir: string): string[] => {
  const targets = new Set<string>();
  for (const file of globSync(`${dir}/src/**/*.{ts,tsx}`)) {
    for (const [, name] of readFileSync(file, 'utf8').matchAll(/resolve\([^)]*?['"]([\w.-]+\.[a-z]+)['"]\)/g)) {
      for (const match of globSync(`${dir}/src/**/${name}`)) {
        targets.add(relative(dir, match));
      }
    }
  }
  return [...targets];
};

/**
 * Modules pulled in lazily as `() => import('./handler')`. Operation handler sets register their
 * implementations this way, and knip does not follow a dynamic import in that position.
 */
const lazyImportedEntry = (dir: string): string[] => {
  const targets = new Set<string>();
  for (const file of globSync(`${dir}/src/**/*.{ts,tsx}`)) {
    for (const [, specifier] of readFileSync(file, 'utf8').matchAll(/\bimport\('(\.[^']+)'\)/g)) {
      targets.add(`${relative(dir, join(dirname(file), specifier))}.{ts,tsx}`);
    }
  }
  return [...targets];
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
/**
 * Files a moon task names directly — an esbuild `--alias` target or a script its command runs.
 * Neither is reachable through an import.
 */
const moonReferencedEntry = (dir: string): string[] => {
  const tasks = globSync(`${dir}/moon.yml`).map((file) => readFileSync(file, 'utf8'))[0] ?? '';
  const paths = [...tasks.matchAll(/([\w./-]+\.(?:mjs|cjs|jsx?|tsx?))/g)].map(([, path]) => path.replace(/^\.\//, ''));
  return [...new Set(paths)].filter((path) => globSync(`${dir}/${path}`).length > 0);
};

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
 * Dependencies declared only to satisfy another dependency's peer requirement — `zone.js` backs
 * OpenTelemetry's web auto-instrumentation. Nothing imports them, but dropping one breaks install.
 */
const peerSatisfyingDependencies = (dir: string, names: string[]): string[] => {
  const required = new Set(
    names.flatMap((name) => {
      const manifest = globSync(`${dir}/node_modules/${name}/package.json`)[0];
      return manifest ? Object.keys(JSON.parse(readFileSync(manifest, 'utf8')).peerDependencies ?? {}) : [];
    }),
  );
  return names.filter((name) => required.has(name));
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

/**
 * Files the shared root configs reach into a workspace for by path — the vitest browser log setup
 * is loaded this way. Nothing in the owning workspace imports them.
 */
const ROOT_REFERENCED = globSync(['*.config.{ts,mts}', 'vitest/**/*.{ts,mjs}']).flatMap((file) => {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/'\.\/((?:packages|tools|vendor)\/[\w./-]+\.(?:mjs|cjs|jsx?|tsx?))'/g)].map(
    ([, path]) => path,
  );
});

/**
 * The root's own dependencies are deliberately not audited. They are consumed by moon task commands
 * and the shared vitest/vite bases rather than by the handful of files knip attributes to the root
 * workspace, so nearly all of them read as unused; removing them breaks `pnpm install` on peer
 * resolution. Auditing them needs a pass of its own. The workspace itself still has to be analysed —
 * it is what supplies `vitest` and friends to every other package — so this ignores the
 * dependencies rather than the workspace. Drop this to see the root backlog.
 */
const rootManifest = JSON.parse(readFileSync('package.json', 'utf8'));

const workspaces: KnipConfig['workspaces'] = {
  '.': {
    entry: ['*.{ts,mts}', 'scripts/**/*.{ts,mjs}', 'vitest/**/*.{ts,mjs}'],
    project: ['*.{ts,mts}', 'scripts/**/*.{ts,mjs}', 'vitest/**/*.{ts,mjs}'],
    ignoreDependencies: Object.keys({ ...rootManifest.dependencies, ...rootManifest.devDependencies }),
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
    browser = {},
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

  // The `browser` field swaps a node module for a browser one at bundle time; the replacement is
  // never imported by name.
  const substitutes = Object.values(browser as Record<string, string>).filter((path) => MODULE.test(path));

  // An `index.html` is the real entry for an app, and knip cannot see through it, so nothing in the
  // package looks reachable even when its manifest also declares library exports.
  const isApp = globSync(`${dir}/index.html`).length > 0;

  // What the package itself declares as its entry points. Only these decide whether the whole-source
  // fallback applies — a supplemental reference must never make a package look fully mapped.
  const entry = [...declared, ...published, ...substitutes, ...moonBuildArgs(dir, 'entryPoint')];

  // Reached by path from a build config rather than declared, so they extend the entry set without
  // standing in for it.
  const supplemental = [
    ...configuredEntry(dir),
    ...lazyImportedEntry(dir),
    ...pathResolvedEntry(dir),
    ...moonReferencedEntry(dir),
    ...ROOT_REFERENCED.filter((path) => path.startsWith(`${dir}/`)).map((path) => path.slice(dir.length + 1)),
  ];

  workspaces[dir] = {
    entry: [
      ...(entry.length && !isApp ? entry : ['src/**/*.{ts,tsx,js,jsx,mjs,cjs}', '*.{ts,tsx,js,jsx,mjs,cjs}']).map(
        (p) => `${p}!`,
      ),
      ...supplemental.map((p) => `${p}!`),
      ...AUXILIARY_ENTRY,
    ],
    project: PROJECT.map((p) => `${p}!`),
    paths,
    ignoreDependencies: [
      ...configuredDependencies(dir, Object.keys({ ...dependencies, ...devDependencies })),
      ...moonInvokedDependencies(dir, Object.keys({ ...dependencies, ...devDependencies })),
      ...peerSatisfyingDependencies(dir, Object.keys({ ...dependencies, ...devDependencies })),
      ...bundledDependencies(dir),
    ],
  };
}

const config: KnipConfig = {
  workspaces,
  // The issue types this repo gates on. Unused exports and types are deliberately excluded: barrel
  // files re-export far more than any one consumer uses, so they are noise here.
  include: ['files', 'dependencies', 'devDependencies', 'unlisted', 'binaries', 'unresolved'],
  // Knip's exit code only counts issue types marked `error`; unused files default to a warning, so
  // without this the CI gate reports regressions and still passes.
  rules: {
    files: 'error',
    // Referencing an optional peer is legitimate use, not an unused-code signal.
    optionalPeerDependencies: 'off',
    dependencies: 'error',
    devDependencies: 'error',
    unlisted: 'error',
    binaries: 'error',
    unresolved: 'error',
  },
  ignoreBinaries: [
    // System tools, not npm packages.
    'jq',
    'sips',
    'printf',
    // 1Password CLI, installed on the machines that run the credential scripts.
    'op',
    // Invoked in CI from the runner image rather than from the workspace.
    'nx',
    // Provided by the tauri toolchain a tagged task pulls in.
    'tauri',
    // Repo-local: a workspace tool and a checked-in script, neither an installed binary.
    'beast',
    'scripts/changed',
    // Tailwind v4 ships its CLI as a separate `@tailwindcss/cli` package; the `tailwind-check`
    // script predates that split and is not wired into any task.
    'tailwindcss',
    // Provided by @storybook/test-runner, which the storybook harness installs on demand.
    'test-storybook',
  ],
  ignoreDependencies: [
    //
    '@dxos/node-std',
    '@bufbuild/buf',
    '@bufbuild/protoc-gen-es',
    // Virtual module the ui-theme vite plugin resolves at build time, not a package.
    '@dxos-theme',
    // Supplied by the editor at runtime to extensions, never installed.
    'vscode',
    // `dxos:` is a virtual scheme the function runtime resolves for user scripts; the script
    // templates that import it are shipped as text, not compiled.
    'dxos',
    // Stand-in packages the introspection fixtures resolve among themselves.
    /^@fixture\//,
    // Required as a peer by a transitive `@effect/cluster`, so pnpm demands the workspace declare
    // it even though nothing imports it and no direct dependency names it.
    '@effect/workflow',
  ],
  // `require.resolve`d at runtime from the emitted bundle, so the path is relative to `dist` rather
  // than to the source file knip reads it from.
  ignoreUnresolved: [
    /^\.\.\/\.\.\/polyfills\//,
    // A moon/vite-node task name in a package script, not a module.
    /^watch$/,
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
