//
// Copyright 2026 DXOS.org
//

import {
  type VirtualTypeScriptEnvironment,
  createDefaultMapFromCDN,
  createSystem,
  createVirtualTypeScriptEnvironment,
} from '@typescript/vfs';
import ts from 'typescript';

import { invariant } from '@dxos/invariant';

/**
 * TS version used to fetch lib .d.ts files from `playgroundcdn.typescriptlang.org`.
 * Pinned to 5.6.3 because 5.7+ removed `lib.es2022.sharedmemory.d.ts` from the
 * CDN. Remaining 404s (`lib.core.d.ts`, `lib.core.es6/7.d.ts`, `lib.es7.d.ts`)
 * are phantom entries in `@typescript/vfs`'s hardcoded file list and are
 * harmlessly caught.
 */
const CDN_TS_VERSION = '5.6.3';

const defaultOptions: ts.CompilerOptions = {
  lib: ['DOM', 'es2022'],
  target: ts.ScriptTarget.ES2022,
  // Override `@typescript/vfs`'s default of `NodeJs` (== deprecated `node10`).
  // TypeScript 6 throws on that as a `getCompilerOptionsDiagnostics()` error.
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  // CommonJS emit so the produced JS can be evaluated inside a
  // `new Function('console', 'exports', source)` wrapper for op:runBuild.
  // ESM emits `export` declarations that don't run in a function scope.
  module: ts.ModuleKind.CommonJS,
  esModuleInterop: true,
};

export type DiagnosticSeverity = 'error' | 'warning';

export type Diagnostic = {
  path?: string;
  line?: number;
  column?: number;
  severity: DiagnosticSeverity;
  code?: number;
  message: string;
};

/**
 * In-browser TypeScript compiler backed by `@typescript/vfs`. Wraps the
 * TypeScript language service against a virtual filesystem, fetching lib
 * `.d.ts` files lazily from the playground CDN on first initialization.
 *
 * The compiler is intended to be instantiated once per page and reused across
 * operation invocations — the CDN fetch is the slow part and the
 * `LanguageService` benefits from cross-call caching of program state.
 *
 * Identical in spirit to `@dxos/plugin-script`'s `Compiler` (`packages/plugins/
 * plugin-script/src/compiler/compiler.ts`). Duplicated here because that class
 * is not exported from `@dxos/plugin-script`'s package entry; if we extract it
 * into a shared `@dxos/ts-compiler` package later, both plugins can switch.
 */
export class Compiler {
  #env: VirtualTypeScriptEnvironment | undefined;
  #fsMap: Map<string, string> | undefined;
  readonly #files = new Set<string>();

  constructor(private readonly _options: ts.CompilerOptions = defaultOptions) {}

  async initialize(): Promise<void> {
    if (this.#env) {
      return;
    }

    // Cache lib .d.ts via `localStorage` in the browser; disable in Node (tests)
    // where `localStorage` is not defined and the call would otherwise throw.
    const cache = typeof localStorage !== 'undefined';
    this.#fsMap = await createDefaultMapFromCDN(this._options, CDN_TS_VERSION, cache, ts);
    const system = createSystem(this.#fsMap);
    this.#env = createVirtualTypeScriptEnvironment(system, [], ts, this._options);
  }

  get environment(): VirtualTypeScriptEnvironment {
    invariant(this.#env, 'Compiler environment not initialized.');
    return this.#env;
  }

  /** Idempotent: creates the file on first call, updates on subsequent calls. */
  setFile(fileName: string, content: string): void {
    invariant(this.#fsMap, 'File system map not initialized.');
    if (this.#files.has(fileName)) {
      this.environment.updateFile(fileName, content);
    } else {
      this.environment.createFile(fileName, content);
      this.#files.add(fileName);
    }
  }

  removeFile(fileName: string): void {
    if (!this.#files.has(fileName)) {
      return;
    }
    // `VirtualTypeScriptEnvironment.deleteFile` was added in @typescript/vfs 1.6.
    this.environment.deleteFile(fileName);
    this.#files.delete(fileName);
  }

  /** Currently-tracked user files (excludes lib.d.ts entries). */
  files(): readonly string[] {
    return [...this.#files];
  }

  compile(fileName: string): ts.EmitOutput {
    return this.environment.languageService.getEmitOutput(fileName);
  }

  /**
   * Returns combined syntactic + semantic diagnostics for a file, normalized
   * to {@link Diagnostic}.
   */
  diagnostics(fileName: string): Diagnostic[] {
    const service = this.environment.languageService;
    return [...service.getSyntacticDiagnostics(fileName), ...service.getSemanticDiagnostics(fileName)].map(
      (diag): Diagnostic => {
        const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
        const file = diag.file;
        if (file && diag.start !== undefined) {
          const { line, character } = file.getLineAndCharacterOfPosition(diag.start);
          return {
            path: file.fileName,
            line: line + 1,
            column: character + 1,
            severity: severityOf(diag.category),
            code: diag.code,
            message,
          };
        }
        return {
          severity: severityOf(diag.category),
          code: diag.code,
          message,
        };
      },
    );
  }
}

const severityOf = (category: ts.DiagnosticCategory): DiagnosticSeverity =>
  category === ts.DiagnosticCategory.Error ? 'error' : 'warning';
