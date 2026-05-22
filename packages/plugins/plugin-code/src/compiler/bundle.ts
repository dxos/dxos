//
// Copyright 2026 DXOS.org
//

import * as esbuild from 'esbuild-wasm';

import { type Diagnostic } from './compiler';

/** Structurally identical to {@link build.LoadedFile}; locally scoped to avoid a cyclic re-export. */
type LoadedFile = { path: string; content: string };

export type BundleResult =
  | { ok: true; source: string; errors: readonly Diagnostic[] }
  | { ok: false; source: undefined; errors: readonly Diagnostic[] };

let _initialized = false;
let _initPromise: Promise<void> | undefined;

/**
 * Lazily initialize esbuild-wasm. In the browser the WASM blob loads over the
 * network on first call (~3MB; cached after). In Node the same call spawns a
 * helper process. The double-init guard handles concurrent callers — esbuild
 * throws if `.initialize()` is called twice without a stop in between.
 */
export const ensureEsbuild = async (): Promise<void> => {
  if (_initialized) {
    return;
  }
  if (!_initPromise) {
    _initPromise = esbuild
      .initialize({})
      .then(() => {
        _initialized = true;
        _initPromise = undefined;
      })
      .catch((err: unknown) => {
        _initPromise = undefined;
        // Re-throw if it's not the "already initialized" race that a co-runner
        // can hit when two callers race to initialize.
        const message = err instanceof Error ? err.message : String(err);
        if (!/already/i.test(message)) {
          throw err;
        }
        _initialized = true;
      });
  }
  return _initPromise;
};

/**
 * F-12b: bundle a multi-file `LoadedFile[]` set rooted at `entryPath`. Uses
 * an esbuild plugin to resolve `.` / `..` imports against the in-memory FS;
 * bare imports (e.g. `@dxos/echo`) intentionally fail in F-12b — host
 * externals via import maps are deferred to F-13.
 */
export const bundleEntry = async (files: readonly LoadedFile[], entryPath: string): Promise<BundleResult> => {
  await ensureEsbuild();
  const fileMap = new Map(files.map((file) => [normalizePath(file.path), file.content]));

  const plugin: esbuild.Plugin = {
    name: 'echo-fs',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === 'entry-point') {
          const path = normalizePath(args.path);
          if (fileMap.has(path)) {
            return { path, namespace: 'echo' };
          }
          return { errors: [{ text: `Entry "${args.path}" is not in the project's source files.` }] };
        }

        if (args.namespace !== 'echo') {
          return null;
        }

        if (args.path.startsWith('./') || args.path.startsWith('../')) {
          const baseDir = posixDirname(args.importer);
          const joined = posixJoin(baseDir, args.path);
          const resolved = resolveExtension(fileMap, joined);
          if (resolved) {
            return { path: resolved, namespace: 'echo' };
          }
          return {
            errors: [
              {
                text: `Cannot resolve "${args.path}" from "${args.importer}". F-12b only bundles files in the project.`,
              },
            ],
          };
        }

        // Bare imports — host externals not implemented until F-13.
        return {
          errors: [
            {
              text: `Unresolved bare import "${args.path}". Host externals (e.g. @dxos/*) are deferred to F-13.`,
            },
          ],
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'echo' }, (args) => {
        const content = fileMap.get(args.path);
        if (content === undefined) {
          return { errors: [{ text: `No file at "${args.path}".` }] };
        }
        return { contents: content, loader: loaderForPath(args.path) };
      });
    },
  };

  try {
    const result = await esbuild.build({
      entryPoints: [normalizePath(entryPath)],
      bundle: true,
      format: 'cjs',
      target: 'es2022',
      platform: 'browser',
      write: false,
      logLevel: 'silent',
      plugins: [plugin],
    });
    const errors = toDiagnostics(result.errors);
    if (errors.length > 0) {
      return { ok: false, source: undefined, errors };
    }
    const output = result.outputFiles?.[0]?.text ?? '';
    return { ok: true, source: output, errors: [] };
  } catch (err) {
    if (err && typeof err === 'object' && 'errors' in err && Array.isArray((err as { errors: unknown[] }).errors)) {
      const errors = toDiagnostics((err as esbuild.BuildFailure).errors);
      return { ok: false, source: undefined, errors };
    }
    throw err;
  }
};

/**
 * Heuristic: does this project need esbuild bundling, or can the F-12a
 * single-file TypeScript transpile path handle it? We bundle whenever the
 * project contains more than one `.ts`/`.tsx` file or when the entry has any
 * static `import` statement.
 */
export const needsBundling = (files: readonly LoadedFile[], entry: LoadedFile): boolean => {
  const tsFiles = files.filter((file) => /\.tsx?$/.test(file.path));
  if (tsFiles.length > 1) {
    return true;
  }
  return /^\s*import[\s({]/m.test(entry.content);
};

const loaderForPath = (path: string): esbuild.Loader => {
  if (path.endsWith('.tsx')) {
    return 'tsx';
  }
  if (path.endsWith('.ts')) {
    return 'ts';
  }
  if (path.endsWith('.jsx')) {
    return 'jsx';
  }
  if (path.endsWith('.json')) {
    return 'json';
  }
  return 'js';
};

const normalizePath = (path: string): string => path.replace(/^\.\//, '');

const posixDirname = (path: string): string => {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
};

const posixJoin = (base: string, relative: string): string => {
  const parts = (base ? base.split('/') : []).concat(relative.split('/'));
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') {
      continue;
    }
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
};

const resolveExtension = (fileMap: Map<string, string>, path: string): string | undefined => {
  const candidates = [path, `${path}.ts`, `${path}.tsx`, `${path}.js`, `${path}/index.ts`, `${path}/index.tsx`];
  return candidates.find((candidate) => fileMap.has(candidate));
};

const toDiagnostics = (messages: readonly esbuild.Message[]): Diagnostic[] =>
  messages.map((message) => ({
    severity: 'error',
    path: message.location?.file,
    line: message.location?.line,
    column: message.location?.column,
    message: message.text,
  }));
