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
  // `tst` is tstyche: a type-level test, run by the `test-types` task, imported by nothing.
  'src/**/*.{test,spec,tst}.{ts,tsx}',
  // Solid and Lit storybooks use their own suffix so the react storybook does not pick them up.
  'src/**/*.{stories,solid-stories,lit-stories}.{ts,tsx}',
  'src/**/*.eval.{ts,tsx}',
  // `.js` too: a testing helper can be a plain script a package runs by path (`node
  // ./src/testing/build.js`), which nothing imports.
  'src/testing/**/*.{ts,tsx,js,mjs,cjs}',
  'src/playwright/**/*.{ts,tsx}',
  'src/vitest-setup.{ts,tsx}',
  // Spawned as their own process, so nothing imports them.
  'src/**/*-subprocess.{ts,tsx}',
  // Loaded via `new Worker(new URL('./x-worker.ts', import.meta.url))`, which knip does not follow.
  'src/**/*-worker.{ts,tsx}',
  // Audio worklets, loaded via `audioWorklet.addModule(new URL('./x-processor.js', import.meta.url))`.
  'src/**/*-processor.js',
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
    // A list too long to inline lives beside the config it feeds (composer-app's generated
    // `optimizeDeps.include`), and the names in it are load-bearing all the same.
    `${dir}/src/vite/*.{ts,mts}`,
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
 * Dependencies a package only ever imports a type from. `--strict` does not credit a type-only
 * import, on the reasoning that nothing needs the package at runtime — but the emitted `.d.ts`
 * still references it, so a consumer's typecheck resolves it and it belongs in `dependencies`.
 * Scoped to names the package actually type-imports, so one it never mentions is still reported.
 */
const typeOnlyDependencies = (dir: string, names: string[]): string[] => {
  // Only production files decide this: a story importing the package for a value says nothing about
  // whether the published code needs it at runtime.
  const sources = globSync(`${dir}/src/**/*.{ts,tsx}`)
    .filter((file) => !/\.(?:stories|solid-stories|lit-stories|test|spec|eval)\.[tj]sx?$/.test(file))
    .filter((file) => !file.includes('/testing/') && !file.includes('/stories/'))
    .map((file) => readFileSync(file, 'utf8'));
  return names.filter((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const typeOnly = new RegExp(`import type [^;]*? from '${escaped}(?:/[^']*)?'`);
    const value = new RegExp(`import (?!type )[^;]*? from '${escaped}(?:/[^']*)?'`);
    return sources.some((source) => typeOnly.test(source)) && !sources.some((source) => value.test(source));
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

/**
 * Every workspace package's public entry points, mapped to source. Knip resolves a cross-package
 * import through the published conditions, and for a type-only import that is `types` — which
 * points into `dist/types`. That exists after a build and not on a clean checkout, so without this
 * the same command reports different results locally and in CI.
 */
const WORKSPACE_PATHS: Record<string, string[]> = {};
for (const manifest of globSync(['packages/**/package.json', 'tools/**/package.json', 'vendor/**/package.json'], {
  exclude: (path) => path.includes('node_modules'),
})) {
  const dir = dirname(manifest);
  const { name, exports = {} } = JSON.parse(readFileSync(manifest, 'utf8'));
  if (!name) {
    continue;
  }
  for (const [subpath, target] of Object.entries(exports)) {
    const [source] = sourceTargets(target).filter((path) => MODULE.test(path));
    if (source) {
      WORKSPACE_PATHS[join(name, subpath).replace(/\/$/, '')] = [join(dir, source.replace(/^\.\//, ''))];
    }
  }
}

/**
 * Packages that a dependency imports from its own shipped files without declaring them anywhere.
 * The bundler resolves those against the workspace that declares the dependency, so it has to carry
 * them even though no source file in the repo imports them. `reveal.js` ships a markdown plugin
 * that imports `marked` and declares no dependencies at all, so unlike `--bundlePackage` this
 * cannot be read off a manifest — only an app bundle surfaces it.
 */
/**
 * Dependencies knip's traversal does not credit. It stops short of a file whose only route to an
 * entry point is indirect — a barrel's `export *`, or a dynamic `import()` whose specifier carries
 * an explicit `.ts`/`.tsx` extension (as `rewriteRelativeImportExtensions` requires) — so a package
 * whose single use of a dependency sits behind one reads as unused even though the symbol is called
 * at runtime and the build resolves it. Verified per entry by adding a direct import at the package
 * entry, which clears the finding.
 */
const TRAVERSAL_MISSED: Record<string, string[]> = {
  // `functions/edge-function.ts` calls `SchemaAST.getPropertySignatures`, and reaches the entry only
  // as `src/index.ts` -> `./functions` -> `./edge-function`.
  'packages/core/compute/compute-hyperformula': ['@dxos/effect'],
  // `debug/plugin.ts` reaches `Debug.tsx` only via `Capability.lazyModule(..., () => import('./Debug.tsx'))` —
  // an extensioned dynamic import, which knip's traversal does not follow.
  'packages/sdk/app-toolkit': ['@dxos/react-ui-syntax-highlighter'],
};

/**
 * Resolved from the workspace store by a checked-in developer script rather than declared, so a
 * package is not made to install a heavy native dependency for a generator that runs only when its
 * checked-in output changes.
 */
const SCRIPT_STORE_RESOLVED: Record<string, string[]> = {
  // `scripts/generate-icon.mjs` rasterises the DXOS mark with sharp when the brand asset changes.
  'packages/core/compute/mcp-server': ['sharp'],
};

const BUNDLER_RESOLVED: Record<string, string[]> = {
  'packages/plugins/plugin-presenter': ['marked'],
  // edge-compute generates a function entrypoint containing
  // `await import('@dxos/functions-runtime-cloudflare')` and gives esbuild a `resolveDir` of its
  // own source directory, so the import resolves from here rather than from any importing file.
  'packages/core/compute/edge-compute': ['@dxos/functions-runtime-cloudflare'],
  // `index.html` links these by path rather than importing them, so no module graph reaches them —
  // and unstyled, `#spaces` becomes a full-flow block over the todo list that swallows every click.
  'packages/apps/todomvc': ['todomvc-app-css', 'todomvc-common'],
  // Astro's default image service is emitted into `docs/dist/.prerender/` and `import('sharp')`s
  // from there, so the package has to resolve from `docs/node_modules` — astro's own optional
  // dependency is not reachable from the emitted chunk.
  'docs': ['sharp'],
  // `@opentui/core` reaches its native library through a dynamic import interpolating
  // `process.platform`/`process.arch`, which bun folds into a constant per `--compile` target, so
  // cross-compiling the CLI resolves all five at bundle time. pnpm installs them for the host
  // platform only, hence the explicit declarations.
  'packages/devtools/cli': [
    '@opentui/core-darwin-arm64',
    '@opentui/core-darwin-x64',
    '@opentui/core-linux-arm64',
    '@opentui/core-linux-x64',
    '@opentui/core-win32-x64',
  ],
};

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
    project: PROJECT.map((path) => `${path}!`),
    paths: { ...WORKSPACE_PATHS, ...paths },
    ignoreDependencies: [
      ...configuredDependencies(dir, Object.keys({ ...dependencies, ...devDependencies })),
      ...moonInvokedDependencies(dir, Object.keys({ ...dependencies, ...devDependencies })),
      ...peerSatisfyingDependencies(dir, Object.keys({ ...dependencies, ...devDependencies })),
      ...typeOnlyDependencies(dir, Object.keys(dependencies)),
      ...bundledDependencies(dir),
      ...(BUNDLER_RESOLVED[dir] ?? []),
      ...(TRAVERSAL_MISSED[dir] ?? []),
      ...(SCRIPT_STORE_RESOLVED[dir] ?? []),
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
    // Shipped by @dxos/app-framework, a dependency of every plugin the `composer-plugin` tag
    // applies to; the tag file that invokes it lives at the root, which declares no such dep.
    'dx-plugin',
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
