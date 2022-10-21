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
  return obj.toJSON ? `${Object.getPrototypeOf(obj).constructor.name}(${inspect(obj.toJSON())}})` : String(obj);
};
