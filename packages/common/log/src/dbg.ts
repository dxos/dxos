//
// Copyright 2026 DXOS.org
//

import { type CallMetadata } from './meta';
import { inspect } from 'node:util';
/**
 * Debug-log value to console.
 * Log's the expression being evaluated.
 *
 * If only one argument is provided, it will also be returned.
 *
 * @example
 * ```ts
 * dbg(foo, bar);
 * // foo = 1
 * // bar = 2
 *
 * bar = dbg(foo * 2);
 * // foo * 2 = 2
 * ```
 *
 * NOTE: The second argument is injected by the log transform plugin.
 */
export const dbg: {
  <T>(value: T, _meta?: CallMetadata): T;
} = <T>(arg: T, meta?: CallMetadata): T => {
  if (meta?.A) {
    console.log(`${meta.A[0]} =`, inspect(arg, { colors: true }));
  } else {
    console.log(inspect(arg, { colors: true }));
  }

  return arg;
};
