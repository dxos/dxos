//
// Copyright 2024 DXOS.org
//

import '@hazae41/symbol-dispose-polyfill';

/**
 * Run function on scope exit. Go style.
 *
 * @example
 * ```ts
 * {
 *   using _ = defer(() => console.log('exiting'));
 *
 *   ...
 * }
 */
export const defer = (fn: () => void): Disposable => new DeferGuard(fn);

class DeferGuard {
  /**
   * @internal
   */
  constructor(private readonly _fn: () => void) {}

  [Symbol.dispose](): void {
    const result = this._fn();
    if ((result as any) instanceof Promise) {
      throw new Error('Async functions in defer are not supported. Use deferAsync instead.');
    }
  }
}

/**
 * Run async function on scope exit. Go style.
 *
 * @example
 * ```ts
 * {
 *   await using _ = deferAsync(async () => console.log('exiting'));
 *
 *   ...
 * }
 */
export const deferAsync = (fn: () => Promise<void>): AsyncDisposable => new DeferAsyncGuard(fn);

class DeferAsyncGuard implements AsyncDisposable {
  /**
   * @internal
   */
  constructor(private readonly _fn: () => Promise<void>) {}

  async [Symbol.asyncDispose](): Promise<void> {
    await this._fn();
  }
}
