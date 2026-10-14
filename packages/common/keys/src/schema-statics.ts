//
// Copyright 2026 DXOS.org
//

/**
 * Merges statics onto a schema value.
 * Defines them as own properties first because the schema prototype's `make` is a getter-only accessor,
 * which `Object.assign` alone cannot overwrite; the assign then only types the result.
 */
export const withStatics = <S extends object, T extends object>(schema: S, statics: T): S & T => {
  Object.defineProperties(schema, Object.getOwnPropertyDescriptors(statics));
  return Object.assign(schema, statics);
};
