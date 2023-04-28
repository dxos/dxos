//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Unique.
// TODO(burdon): Options for undefined to end.

type Compare<T> = (a: T, b: T) => number;

export const compareScalar =
  (inc = true) =>
  (a: any, b: any) =>
    (inc ? 1 : -1) * (a < b ? -1 : a > b ? 1 : 0);

export const compareString =
  (inc = true, caseInsensitive = true) =>
  (a: string, b: string) => {
    if (caseInsensitive) {
      a = a?.toLowerCase();
      b = b?.toLowerCase();
    }
    return (inc ? 1 : -1) * (a < b ? -1 : a > b ? 1 : 0);
  };

export const compareObject =
  <T extends Record<string, any>>(prop: string, sorter: Compare<any>, inc = true): Compare<any> =>
  (a: T, b: T) =>
    (inc ? 1 : -1) * sorter(a[prop], b[prop]);

export const compareMulti =
  <T extends Record<string, any>>(sorters: Compare<T>[]) =>
  (a: T, b: T) => {
    const sort = (i = 0): number => {
      const s = sorters[i](a, b);
      if (s === 0 && i < sorters.length - 1) {
        return sort(i + 1);
      } else {
        return s;
      }
    };

    return sort();
  };
