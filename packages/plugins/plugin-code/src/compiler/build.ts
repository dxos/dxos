//
// Copyright 2026 DXOS.org
//

import { bundleEntry, needsBundling } from './bundle';
import { type Diagnostic } from './compiler';
import { getCompiler } from './singleton';

export type LoadedFile = { path: string; content: string };

export type BuildResult =
  | { ok: true; diagnostics: Diagnostic[]; entry: { path: string; source: string } }
  | { ok: false; diagnostics: Diagnostic[]; entry: undefined };

export type RunResult = {
  ok: boolean;
  stdout: string[];
  stderr: string[];
};

/** Conventional entry filenames searched in priority order. */
export const ENTRY_CANDIDATES = ['src/hello.ts', 'src/plugin.ts'];

/**
 * TypeScript diagnostic codes that report a missing module. Under
 * `module: CommonJS` (chosen for F-12a's clean emit), the language service
 * sometimes refuses to resolve relative imports the way the bundler does;
 * we filter these in the bundling path because esbuild owns resolution there
 * and will surface its own errors if a module really is missing.
 *
 * - 2307: Cannot find module 'X' or its corresponding type declarations.
 * - 2792: Cannot find module 'X'. Did you mean to set 'moduleResolution'…?
 * - 7016: Could not find a declaration file for module 'X'.
 */
const MODULE_RESOLUTION_CODES = new Set([2307, 2792, 7016]);

const pickEntry = (files: readonly LoadedFile[]): LoadedFile | undefined =>
  ENTRY_CANDIDATES.map((path) => files.find((file) => file.path === path)).find((file) => file !== undefined);

/**
 * Compile a project's source files. Always runs the TypeScript language
 * service for type-check diagnostics, then dispatches emission:
 *
 * - F-12a (single-file, no imports): use the language service's
 *   `getEmitOutput` to transpile the entry. Fast (no esbuild boot).
 * - F-12b (multi-file or imports present): bundle through esbuild-wasm.
 *   The language service still owns diagnostics; esbuild owns emit.
 */
export const compileEntry = async (files: readonly LoadedFile[]): Promise<BuildResult> => {
  const entry = pickEntry(files);
  if (!entry) {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          message: `No entry file found. Expected one of: ${ENTRY_CANDIDATES.join(', ')}.`,
        },
      ],
      entry: undefined,
    };
  }

  const compiler = await getCompiler();
  // Sync the compiler's virtual FS to exactly this project's file set. The
  // `Compiler` instance is a page-level singleton, so without this step files
  // from a previously-built CodeProject (or files deleted from the current
  // project) would linger in the language-service program and cause ghost
  // module resolutions and stale diagnostics. We only manage the user's `.ts`
  // / `.tsx` files; lib `.d.ts` entries fetched from the CDN are untouched.
  const desired = new Set(files.map((file) => file.path));
  for (const tracked of compiler.files()) {
    if (!desired.has(tracked)) {
      compiler.removeFile(tracked);
    }
  }
  for (const file of files) {
    compiler.setFile(file.path, file.content);
  }

  const willBundle = needsBundling(files, entry);
  const rawDiagnostics = compiler.diagnostics(entry.path);
  const diagnostics = willBundle
    ? rawDiagnostics.filter((diag) => diag.code === undefined || !MODULE_RESOLUTION_CODES.has(diag.code))
    : rawDiagnostics;
  if (diagnostics.some((diag) => diag.severity === 'error')) {
    return { ok: false, diagnostics, entry: undefined };
  }

  if (willBundle) {
    const bundled = await bundleEntry(files, entry.path);
    if (!bundled.ok) {
      return {
        ok: false,
        diagnostics: [...diagnostics, ...bundled.errors],
        entry: undefined,
      };
    }
    return {
      ok: true,
      diagnostics,
      entry: { path: entry.path, source: bundled.source },
    };
  }

  const emit = compiler.compile(entry.path);
  const jsOutput = emit.outputFiles.find((file) => file.name.endsWith('.js'));
  if (!jsOutput) {
    return {
      ok: false,
      diagnostics: [
        ...diagnostics,
        {
          severity: 'error',
          path: entry.path,
          message: 'TypeScript compiler emitted no JavaScript output.',
        },
      ],
      entry: undefined,
    };
  }

  return {
    ok: true,
    diagnostics,
    entry: { path: entry.path, source: jsOutput.text },
  };
};

/**
 * Execute compiled JS in a console-capturing wrapper.
 *
 * Uses `new Function('console', 'exports', source)` to give the script its own
 * `console` and `exports` bindings without mutating the host globals. Each
 * call gets its own buffers, so concurrent runs cannot interleave their
 * captured output. CommonJS emit from {@link Compiler} ensures top-level
 * `export const X` statements compile to `exports.X = X` and execute inside
 * the function scope.
 *
 * **Async limitations.** Execution is synchronous. `await` expressions inside
 * the entry resolve as normal microtasks, but any work scheduled past the
 * first turn (timers, unresolved Promises, top-level `await` patterns that
 * don't fully drain before the function returns) is not captured — those
 * `console.log`s land in the buffer *after* {@link RunResult} has already
 * been returned. To support async entries we would need to compile the entry
 * with `'use strict'` + async wrapping and await it before returning.
 *
 * **Security boundary.** The wrapper only shadows `console` and `exports`; it
 * does **not** prevent access to browser globals (`window`, `document`,
 * `fetch`), the network, or browser storage APIs. This is intentional — the
 * function exists to run the user's *own* code from a `CodeProject` so they
 * can iterate on a plugin. **Do not use it to execute untrusted code.**
 */
export const executeScript = (source: string): RunResult => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const consoleShim = {
    log: (...args: unknown[]) => stdout.push(formatArgs(args)),
    info: (...args: unknown[]) => stdout.push(formatArgs(args)),
    debug: (...args: unknown[]) => stdout.push(formatArgs(args)),
    warn: (...args: unknown[]) => stdout.push(formatArgs(args)),
    error: (...args: unknown[]) => stderr.push(formatArgs(args)),
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function('console', 'exports', source);
    fn(consoleShim, {});
    return { ok: true, stdout, stderr };
  } catch (err) {
    stderr.push(err instanceof Error ? (err.stack ?? err.message) : String(err));
    return { ok: false, stdout, stderr };
  }
};

const formatArgs = (args: readonly unknown[]): string =>
  args
    .map((value) => {
      if (typeof value === 'string') {
        return value;
      }
      if (value instanceof Error) {
        return value.stack ?? value.message;
      }
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    })
    .join(' ');
