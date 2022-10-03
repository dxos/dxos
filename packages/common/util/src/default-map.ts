//
// Copyright 2020 DXOS.org
//

/**
 * Wrapper that returns a constructed value if undefined.
 */
export const defaultMap = <K, V> (map: Map<K, V>, def: () => V) => (key: K) => {
  let value = map.get(key);
  if (value === undefined) {
    value = def();
    map.set(key, value);
  }

  return value;
}
