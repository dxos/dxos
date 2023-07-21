//
// Copyright 2020 DXOS.org
//

/**
 * Get or set map value.
 */
export const defaultMap = <K, V>(map: Map<K, V>, key: K, def: V | (() => V)) => {
  let value = map.get(key);
  if (value === undefined) {
    value = typeof def === 'function' ? (def as () => V)() : def;
    map.set(key, value);
  }

  return value;
};
