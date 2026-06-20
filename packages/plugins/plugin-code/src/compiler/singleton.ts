//
// Copyright 2026 DXOS.org
//

import { Compiler } from './compiler';

/**
 * Module-level Compiler shared across operation invocations within a single
 * host page. The CDN fetch for lib `.d.ts` files runs once on first
 * `getCompiler()` call; subsequent calls reuse the same VFS-backed language
 * service. Tests reset state via {@link resetCompiler}.
 */
let _instance: Compiler | undefined;
let _initialization: Promise<Compiler> | undefined;

export const getCompiler = async (): Promise<Compiler> => {
  if (_instance) {
    return _instance;
  }
  if (!_initialization) {
    const compiler = new Compiler();
    _initialization = compiler
      .initialize()
      .then(() => {
        _instance = compiler;
        return compiler;
      })
      .catch((err) => {
        // Clear the cached promise so a subsequent caller can retry — otherwise
        // a transient CDN failure would poison the singleton for the page.
        _initialization = undefined;
        throw err;
      });
  }
  return _initialization;
};

/**
 * Discards the cached compiler. Intended for tests that want a fresh language
 * service; production code should never need this.
 */
export const resetCompiler = (): void => {
  _instance = undefined;
  _initialization = undefined;
};
