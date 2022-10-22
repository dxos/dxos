//
// Copyright 2022 DXOS.org
//

import { inspect } from 'util';

/**
 * Utility to automatically log debug info.
 *
 * ```
 *   // Called via `console.log`.
 *   [inspect.custom] () {
 *     return inspectObject(this);
 *   }
 *
 *   // Called via `JSON.stringify`.
 *   toJSON () {
 *     return { ... };
 *   }
 * ```
 */
export const inspectObject = (obj: any) => {
  const name = Object.getPrototypeOf(obj).constructor.name;
  return obj.toJSON ? `${name}(${inspect(obj.toJSON())})` : String(obj);
};
