//
// Copyright 2026 DXOS.org
//

import { init as initCjsLexer, parse as parseCjs } from 'cjs-module-lexer';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire as nodeCreateRequire } from 'node:module';
import path from 'node:path';
import { type Plugin } from 'vite';

import { DEFAULT_PACKAGES } from './packages';

const require = nodeCreateRequire(import.meta.url);

//
// Import map helpers.
// These utilities support `importMapPlugin` by resolving package entrypoints,
// detecting module formats (ESM vs CJS), and extracting named exports from CJS bundles.
//

/** Strips vite query strings (e.g. `?v=123`) from resolved module IDs. */
const trimQueryString = (id: string) => id.replace(/\?.*$/, '');

/**
 * Determines whether a resolved file is an ESM module by checking file extension
 * first (.mjs/.cjs), then walking up to the nearest package.json for `"type": "module"`.
 */
const resolvedIdIsEsmModule = (resolvedId: string): boolean => {
  const file = trimQueryString(resolvedId);
  if (file.endsWith('.mjs') || file.endsWith('.mts')) {
    return true;
  }
  if (file.endsWith('.cjs') || file.endsWith('.cts')) {
    return false;
  }

  let directory = path.dirname(file);
  while (directory !== path.dirname(directory)) {
    const packageJsonPath = path.join(directory, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { type?: string };
        return pkg.type === 'module';
      } catch {
        return false;
      }
    }
    directory = path.dirname(directory);
  }

  return false;
};

/**
 * Walks up from a resolved file path to find the package.json whose `"name"` matches
 * the given package name. Returns the path to that package.json, or undefined.
 */
const findPackageJsonPath = (resolvedId: string, packageName: string): string | undefined => {
  let directory = path.dirname(trimQueryString(resolvedId));

  while (directory !== path.dirname(directory)) {
    const packageJsonPath = path.join(directory, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name?: string };
        if (packageJson.name === packageName) {
          return packageJsonPath;
        }
      } catch {}
    }

    directory = path.dirname(directory);
  }

  return undefined;
};

/** Resolves a package name to its package.json path using Node's require.resolve. */
const resolvePackageJsonPath = (packageName: string): string | undefined => {
  try {
    return findPackageJsonPath(require.resolve(packageName), packageName);
  } catch {
    return undefined;
  }
};

/**
 * Resolves a package name to its package.json via vite's own resolver, which handles
 * workspace-linked packages whose `exports` field omits `./package.json` (so
 * `require.resolve` can't find it). Falls back to `require.resolve`.
 */
const resolvePackageJsonPathViaContext = async (
  ctx: { resolve: (id: string) => Promise<{ id: string } | null> },
  packageName: string,
): Promise<string | undefined> => {
  try {
    const resolved = await ctx.resolve(packageName);
    if (resolved) {
      const viaResolved = findPackageJsonPath(resolved.id, packageName);
      if (viaResolved) {
        return viaResolved;
      }
    }
  } catch {
    // fall through
  }
  return resolvePackageJsonPath(packageName);
};

/**
 * Subpath exports that should be excluded from the import map.
 * These are node-only entrypoints (vite plugins, native addons) that shouldn't be pre-bundled for the browser.
 *
 * TODO(wittjosiah): Replace these hand-maintained lists (plus {@link GLOBALLY_EXCLUDED_SUBPATHS}
 * and {@link BUILD_TOOL_SUBPATH}) with a structural check — e.g. honour an `agent`/`node`-only
 * export condition in package.json, or probe each subpath's resolved file for `node:*` imports
 * at build time — so every new server-only entrypoint doesn't require a code change here.
 */
const importMapExcludedSubpaths: Readonly<Record<string, ReadonlySet<string>>> = {
  '@dxos/app-framework': new Set(['vite-plugin']),
  // `@dxos/lit-grid/testing` re-exports a playwright page-object manager and pulls
  // `@playwright/test` (and transitive playwright-core) into the browser bundle.
  '@dxos/lit-grid': new Set(['testing']),
  '@dxos/react-ui-mosaic': new Set(['playwright']),
  '@dxos/react-ui-stack': new Set(['playwright']),
  '@dxos/react-ui-table': new Set(['playwright']),
  '@dxos/ui-theme': new Set(['plugin']),
  // `solid-js/web/storage` is a server-only helper that pulls
  // `node:async_hooks` (AsyncLocalStorage) and has no browser shim. Client
  // code imports `solid-js`, `solid-js/store`, and `solid-js/web` only.
  'solid-js': new Set(['web/storage']),
};

/**
 * Subpaths common to many packages that should always be excluded.
 * `./playwright` subdirectories house e2e test harnesses that pull in
 * `@playwright/test` (a node-only package that breaks the browser bundle).
 * `./testing` subpaths similarly expose node-only test helpers (e.g.
 * `@dxos/edge-client/testing` pulls `@dxos/node-std/http` which has no
 * browser analogue) and aren't part of the plugin-facing surface.
 */
const GLOBALLY_EXCLUDED_SUBPATHS = new Set(['playwright', 'testing']);

/**
 * Regex for subpaths that are always node-only build tooling — vite, esbuild, and
 * rollup plugins. These use `node:*` imports and will blow up the browser bundle if
 * they end up in the import map.
 */
const BUILD_TOOL_SUBPATH = /^(vite-plugin|esbuild-plugin|rollup-plugin|plugin)$/;

/**
 * Asset subpaths (CSS, PCSS, images, etc.) that the host already loads via its own
 * bundle — for example `@dxos/react-ui-form` pulls in `@dxos/lit-ui/dx-tag-picker.pcss`
 * on startup, so the stylesheet is already attached to the DOM by the time a remote
 * plugin runs. Community plugins should still be able to _import_ those specifiers
 * (rolldown leaves the `import "…"` statements in the output when the package is
 * externalized), so the import map maps them to a no-op empty ES module. The
 * resulting browser fetch is a cheap no-op; the styles are never re-downloaded
 * and never re-injected.
 */
const ASSET_SUBPATH = /\.(css|pcss|scss|sass|less|json|node|wasm|html|svg|png|jpe?g|gif|webp|ico)$/;
const isAssetSubpath = (specifier: string) => ASSET_SUBPATH.test(specifier);

/**
 * Walks `baseDir` and returns every file that matches the pattern `${baseDir}/<rest>${extension}`.
 * Used to expand wildcard exports like `./proto/*` → `./dist/src/proto/gen/*.js` into their
 * full set of bare specifiers.
 */
const walkDirectoryForExtension = (baseDir: string, extension: string): string[] => {
  if (!existsSync(baseDir)) {
    return [];
  }
  const results: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(full);
      } else if (entry.endsWith(extension)) {
        results.push(path.relative(baseDir, full).slice(0, -extension.length));
      }
    }
  };
  walk(baseDir);
  return results;
};

/** Resolves an `exports` value to a single target path for pattern expansion. */
const pickPatternTarget = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const preferred = obj.browser ?? obj.import ?? obj.default ?? obj.module;
    return typeof preferred === 'string' ? preferred : undefined;
  }
  return undefined;
};

/**
 * Expands a wildcard export like `./proto/*` into concrete subpath specifiers by walking
 * the target directory. Returns `<packageName>/<subpath>` strings.
 */
const expandWildcardExport = (
  packageName: string,
  packageJsonDir: string,
  exportKey: string,
  exportValue: unknown,
): string[] => {
  const target = pickPatternTarget(exportValue);
  if (!target || !target.includes('*')) {
    return [];
  }
  // Split on `*` — at most one supported (node's exports pattern semantics).
  const keyStarIndex = exportKey.indexOf('*');
  const targetStarIndex = target.indexOf('*');
  if (keyStarIndex === -1 || targetStarIndex === -1) {
    return [];
  }
  const keyPrefix = exportKey.slice(2, keyStarIndex); // drop leading './'
  const targetPrefix = target.slice(2, targetStarIndex); // drop leading './'
  const targetSuffix = target.slice(targetStarIndex + 1);
  const baseDir = path.resolve(packageJsonDir, targetPrefix);
  const files = walkDirectoryForExtension(baseDir, targetSuffix || '.js');
  return files.map((relativeNoExt) => `${packageName}/${keyPrefix}${relativeNoExt}`);
};

/**
 * Reads a package's `exports` field and returns all subpath entrypoints as bare specifiers
 * (e.g. `@dxos/client`, `@dxos/client/echo`, `@dxos/lit-ui/dx-tag-picker.pcss`,
 * `@dxos/protocols/proto/dxos/echo/metadata`). Wildcard patterns are expanded by walking
 * the corresponding output directory. Falls back to just the package name if exports is
 * absent or simple.
 */
const getPackageEntrypoints = (packageName: string, packageJsonPath: string): string[] => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    exports?: Record<string, unknown> | string | string[];
  };
  const exportsField = packageJson.exports;

  if (!exportsField || typeof exportsField === 'string' || Array.isArray(exportsField)) {
    return [packageName];
  }

  const exportKeys = Object.keys(exportsField);
  if (!exportKeys.some((key) => key.startsWith('.'))) {
    return [packageName];
  }

  const excluded = importMapExcludedSubpaths[packageName];
  const packageJsonDir = path.dirname(packageJsonPath);
  const modules = exportKeys.flatMap((key) => {
    if (key === '.') {
      return [packageName];
    }

    if (!key.startsWith('./') || key === './package.json') {
      return [];
    }

    // Skip `.d.ts` subpath exports — these are meant to be imported as raw text
    // (e.g. `@dxos/echo-query/api.d.ts?raw` for in-editor type hints), not as
    // ES modules. Enumerating them here would have vite try to bundle the
    // declaration file's imports (protobufjs, effect, etc.), which breaks.
    if (key.endsWith('.d.ts')) {
      return [];
    }

    if (key.includes('*')) {
      // Expand wildcard patterns like `./proto/*` into concrete specifiers.
      return expandWildcardExport(packageName, packageJsonDir, key, (exportsField as Record<string, unknown>)[key]);
    }

    const subpath = key.slice(2);
    if (excluded?.has(subpath) || GLOBALLY_EXCLUDED_SUBPATHS.has(subpath) || BUILD_TOOL_SUBPATH.test(subpath)) {
      return [];
    }

    return [`${packageName}/${subpath}`];
  });

  return modules.length > 0 ? modules : [packageName];
};

/**
 * Statically analyzes a CJS file to extract named exports using cjs-module-lexer.
 * Follows re-exports (e.g. react's index.js re-exports from cjs/react.development.js)
 * and deduplicates. Filters out `default` and `__esModule` pseudo-exports.
 */
const getCjsNamedExports = (filePath: string, seen = new Set<string>()): string[] => {
  const normalized = trimQueryString(filePath);
  if (seen.has(normalized)) {
    return [];
  }
  seen.add(normalized);

  try {
    const source = readFileSync(normalized, 'utf8');
    const { exports: directExports, reexports } = parseCjs(source);

    const reexportedNames = reexports.flatMap((reexport) => {
      const resolved = path.resolve(path.dirname(normalized), reexport);
      const candidates = [resolved, `${resolved}.js`, `${resolved}.cjs`];
      const found = candidates.find((candidate) => existsSync(candidate));
      return found ? getCjsNamedExports(found, seen) : [];
    });

    return [...new Set([...directExports, ...reexportedNames])].filter(
      (name) => name !== 'default' && name !== '__esModule',
    );
  } catch {
    return [];
  }
};

/**
 * Vite plugin for the **host app** (Composer). Generates a browser import map so that
 * shared packages are loaded once and reused by both the host and any remote plugins.
 *
 * In dev mode, maps bare specifiers directly to resolved file paths.
 * In production, emits a dedicated chunk per specifier via virtual wrapper modules,
 * then injects a `<script type="importmap">` tag into the HTML with the chunk URLs.
 *
 * Virtual wrappers are needed because directly emitting chunks for CJS packages loses
 * their named exports due to Rollup's interop. The wrapper re-exports them explicitly.
 */
export const importMapPlugin = (options?: { packages?: string[] }): Plugin[] => {
  const packages = options?.packages ?? DEFAULT_PACKAGES;
  const WRAPPER_PREFIX = '\0import-map:';
  const chunkRefIds: Record<string, string> = {};
  const resolvedIds: Record<string, string> = {};
  let imports: Record<string, string> = {};
  let modules: string[] = [];
  let importMapIsDev = false;
  let base = '/';

  return [
    // Phase 1: Resolve all package entrypoints and emit chunks (or record dev paths).
    {
      name: 'import-map:get-chunk-ref-ids',
      configResolved(config) {
        base = config.base ?? '/';
      },
      async buildStart() {
        importMapIsDev = this.environment.mode === 'dev';
        await initCjsLexer();

        // Expand each package name into its full set of subpath entrypoints
        // (e.g. '@dxos/client' -> ['@dxos/client', '@dxos/client/echo', ...]).
        modules = [
          ...new Set(
            (
              await Promise.all(
                packages.map(async (packageName) => {
                  const packageJsonPath = await resolvePackageJsonPathViaContext(this, packageName);
                  if (!packageJsonPath) {
                    this.warn(`Unable to locate package.json for import map package: ${packageName}`);
                    return [packageName];
                  }

                  return getPackageEntrypoints(packageName, packageJsonPath);
                }),
              )
            ).flat(),
          ),
        ];

        for (const specifier of modules) {
          if (isAssetSubpath(specifier)) {
            // Host already loaded the real asset; remote plugins need the specifier to
            // resolve to *something* that behaves as an ES module. A data URL is the
            // cheapest option — no chunk to emit (rolldown tree-shakes an empty wrapper
            // even with `preserveSignature: 'strict'`, so the referenced file wouldn't
            // exist at runtime), no extra network request, and the same path in dev and prod.
            imports[specifier] = 'data:text/javascript;charset=utf-8,export%20%7B%7D%3B';
            continue;
          }

          const resolved = await this.resolve(specifier);
          if (!resolved) {
            this.warn(`Import map: unable to resolve "${specifier}"; omitting from import map.`);
            continue;
          }

          if (importMapIsDev) {
            // Dev: map bare specifier to the resolved file path, prefixed with vite's
            // `/@fs/` escape hatch so absolute node_modules paths (including
            // `.vite/deps/*` pre-bundled chunks) round-trip through the dev server
            // instead of being resolved against the document origin as a 404.
            const filePath = trimQueryString(resolved.id);
            imports[specifier] = filePath.startsWith('/') ? `/@fs${filePath}` : filePath;
          } else {
            // Prod: emit a virtual wrapper chunk that re-exports from the real module.
            resolvedIds[specifier] = resolved.id;
            chunkRefIds[specifier] = this.emitFile({
              type: 'chunk',
              id: `${WRAPPER_PREFIX}${specifier}`,
              preserveSignature: 'strict',
            });
          }
        }
      },

      // Intercept virtual wrapper IDs so Rollup doesn't try to resolve them as files.
      resolveId(id) {
        if (id.startsWith(WRAPPER_PREFIX)) {
          return id;
        }
      },

      // Generate the source for each virtual wrapper module.
      // For CJS packages, explicitly re-export named exports (discovered via static analysis)
      // because Rollup's `export *` interop doesn't preserve them for CJS.
      load(id) {
        if (!id.startsWith(WRAPPER_PREFIX)) {
          return;
        }
        const specifier = id.slice(WRAPPER_PREFIX.length);
        const resolvedId = resolvedIds[specifier];
        if (!resolvedId) {
          return `export * from ${JSON.stringify(specifier)};\n`;
        }

        const filePath = trimQueryString(resolvedId);
        const isCjs = filePath.endsWith('.cjs') || (!filePath.endsWith('.mjs') && !resolvedIdIsEsmModule(filePath));

        if (isCjs) {
          const named = getCjsNamedExports(filePath);
          if (named.length > 0) {
            return `export { default, ${named.join(', ')} } from ${JSON.stringify(specifier)};\n`;
          }
        }
        return `export * from ${JSON.stringify(specifier)};\n`;
      },

      // After bundling, map each specifier to the URL of its emitted chunk. Preserves
      // asset-subpath entries already written to `imports` during `buildStart` (those
      // use an inline data URL rather than an emitted chunk).
      generateBundle() {
        if (importMapIsDev) {
          return;
        }

        imports = {
          ...imports,
          ...Object.fromEntries(
            modules
              .filter((specifier) => chunkRefIds[specifier] !== undefined)
              .map((specifier) => [specifier, `${base}${this.getFileName(chunkRefIds[specifier])}`]),
          ),
        };
      },
    },

    // Phase 2: Inject the import map into the HTML as a <script type="importmap"> tag.
    {
      name: 'import-map:transform-index-html',
      enforce: 'post',
      transformIndexHtml(html: string) {
        const tags = [
          {
            tag: 'script',
            attrs: {
              type: 'importmap',
            },
            children: JSON.stringify({ imports }, null, 2),
          },
        ];

        return {
          html,
          tags,
        };
      },
    },
  ];
};
