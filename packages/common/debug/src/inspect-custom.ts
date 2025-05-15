//
// Copyright 2024 DXOS.org
//

import type { InspectOptionsStylized, inspect as inspectFn } from 'node:util';

/**
 * Using this allows code to be written in a portable fashion, so that the custom inspect function is used in an Node.js environment and ignored in the browser.
 */
export const inspectCustom = Symbol.for('nodejs.util.inspect.custom');

export type CustomInspectFunction<T = any> = (
  this: T,
  depth: number,
  options: InspectOptionsStylized,
  inspect: typeof inspectFn,
) => any; // TODO: , inspect: inspect

export interface CustomInspectable {
  [inspectCustom]: CustomInspectFunction;
}
