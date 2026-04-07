//
// Copyright 2026 DXOS.org
//

import { init as initCjsLexer, parse as parseCjs } from 'cjs-module-lexer';
import { existsSync, readFileSync } from 'node:fs';
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
 * Subpath exports that should be excluded from the import map.
 * These are node-only entrypoints (vite plugins, native addons) that shouldn't be pre-bundled for the browser.
 */
const importMapExcludedSubpaths: Readonly<Record<string, ReadonlySet<string>>> = {
  '@dxos/app-framework': new Set(['vite-plugin']),
  '@dxos/ui-theme': new Set(['plugin']),
};

/**
 * Reads a package's `exports` field and returns all JS subpath entrypoints as bare specifiers
 * (e.g. `@dxos/client`, `@dxos/client/echo`). Skips wildcard patterns, non-JS assets,
 * and excluded subpaths. Falls back to just the package name if exports is absent or simple.
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
  const modules = exportKeys.flatMap((key) => {
    if (key === '.') {
      return [packageName];
    }

    if (!key.startsWith('./') || key === './package.json' || key.includes('*')) {
      return [];
    }

    const subpath = key.slice(2);
    if (excluded?.has(subpath)) {
      return [];
    }

    if (/\.(css|pcss|scss|less|json|node|wasm|html|svg|png|jpg)$/.test(subpath)) {
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

  return [
    // Phase 1: Resolve all package entrypoints and emit chunks (or record dev paths).
    {
      name: 'import-map:get-chunk-ref-ids',
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
                  const packageJsonPath = resolvePackageJsonPath(packageName);
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
          const resolved = await this.resolve(specifier);
          if (!resolved) {
            this.warn(`Import map: unable to resolve "${specifier}"; omitting from import map.`);
            continue;
          }

          if (importMapIsDev) {
            // Dev: map bare specifier directly to the resolved file path.
            imports[specifier] = trimQueryString(resolved.id);
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

      // After bundling, map each specifier to the URL of its emitted chunk.
      generateBundle() {
        if (importMapIsDev) {
          return;
        }

        imports = Object.fromEntries(
          modules
            .filter((specifier) => chunkRefIds[specifier] !== undefined)
            .map((specifier) => [specifier, `/${this.getFileName(chunkRefIds[specifier])}`]),
        );
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
