//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Unique.
// TODO(burdon): Options for undefined to end.

type Sorter<T> = (a: T, b: T) => number;

export const sortScalar =
  (inc = true) =>
  (a: any, b: any) =>
    (inc ? 1 : -1) * (a < b ? -1 : a > b ? 1 : 0);

export const sortString =
  (inc = true, caseInsensitive = true) =>
  (a: string, b: string) =>
    (inc ? 1 : -1) * (caseInsensitive ? a.toLowerCase().localeCompare(b.toLowerCase()) : a.localeCompare(b));

export const sortObject =
  <T extends Record<string, any>>(prop: string, sorter: Sorter<any>, inc = true): Sorter<any> =>
  (a: T, b: T) =>
    (inc ? 1 : -1) * sorter(a[prop], b[prop]);

export const sortMany =
  <T extends Record<string, any>>(sorters: Sorter<T>[]) =>
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
