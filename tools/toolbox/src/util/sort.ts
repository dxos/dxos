//
// Copyright 2022 DXOS.org
//

import sortBy from 'lodash.sortby';

const isPlainObject = (obj: any) => Object.prototype.toString.call(obj) === '[object Object]';

// TODO(burdon): Replace with npm package?

// Custom key sorter, or array of fixed keys to prefix the naturally sorted list.
type Sorter = string[] | ((value: any) => any);

type SortOptions = {
  // Fixed depth or -1.
  depth?: number;

  // Define custom sorters for given dot-path positions. Set null to prevent sort.
  map?: { [key: string]: Sorter };
};

const createKeySorter = (key: string, { depth = -1, map }: SortOptions) => {
  // TODO(burdon): Allow for wildcard paths (e.g., `targets.**`; meaning grandchildren of targets.)
  const order = map?.[key];
  if (!order) {
    return (values: any[]) => {
      const d = key.split('.').length - 1;
      if (d < depth || depth === -1) {
        values.sort((key1: string, key2: string) => key1.localeCompare(key2));
      }

      return values;
    };
  }

  if (Array.isArray(order)) {
    return (values: any[]) => {
      values.sort((key1: string, key2: string) => {
        const i1 = order.indexOf(key1);
        const i2 = order.indexOf(key2);

        if (i1 !== -1 && i2 !== -1) {
          return i1 < i2 ? -1 : i1 > i2 ? 1 : 0;
        }

        if (i1 !== -1) {
          return -1;
        }

        if (i2 !== -1) {
          return 1;
        }

        return key1.localeCompare(key2);
      });

      return values;
    };
  }
};

const createValueSorter = (key: string, { map }: SortOptions) => {
  const order = map?.[key];
  if (order !== null) {
    if (typeof order === 'function') {
      return (values: any[]) => sortBy(values, order);
    } else {
      // Default.
      return (values: any[]) => sortBy(values);
    }
  }
};

/**
 * Recursively sort object to a given depth.
 * Options enable custom sorting (e.g., partially fixed order).
 */
export const sortJson = (src: any, options: SortOptions = {}, key = '.'): any => {
  let out: Record<string, any>;

  if (Array.isArray(src)) {
    let values = src.map((src, i) => sortJson(src, options, `${key}[${i}]`));
    const sorter = createValueSorter(key, options);
    if (sorter) {
      values = sorter(values);
    }

    return values;
  }

  if (isPlainObject(src)) {
    out = {};
    let keys = Object.keys(src);
    const sorter = createKeySorter(key, options);
    if (sorter) {
      keys = sorter(keys);
    }

    keys.forEach((subkey) => {
      const value = src[subkey];
      out[subkey] = sortJson(value, options, `${key === '.' ? '' : key}.${subkey}`);
    });

    return out;
  }

  return src;
};
