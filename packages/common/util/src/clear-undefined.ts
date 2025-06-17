//
// Copyright 2025 DXOS.org
//

/**
 * Remove undefined values from an object.
 */
export const clearUndefined = <O extends {}>(obj: O): O => {
  for (const key of [...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertySymbols(obj)]) {
    if (obj[key as keyof O] === undefined) {
      delete obj[key as keyof O];
    }
  }
  return obj;
};
