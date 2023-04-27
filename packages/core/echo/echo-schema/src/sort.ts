//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Move to util.
// TODO(burdon): Unique.

type Result = -1 | 0 | 1;
type Object = { [key: string]: any };
type Sorter = <T extends Object>(a: T, b: T) => Result;

export const sortScalar =
  (natural = true) =>
  (a: any, b: any) =>
    (natural ? 1 : -1) * (a < b ? -1 : a > b ? 1 : 0);

export const sortString =
  (natural = true, insensitive = true) =>
  (a: string, b: string) =>
    insensitive
      ? (natural ? 1 : -1) * a.toLowerCase().localeCompare(b.toLowerCase())
      : (natural ? 1 : -1) * a.localeCompare(b);

export const sortObject =
  <T extends Object>(prop: string, sorter: Sorter<T>, natural = true) =>
  (a: T, b: T) =>
    (natural ? 1 : -1) * sorter(a[prop], b[prop]);

export const sortMany =
  <T extends Object>(sorters: Sorter<T>[]) =>
  (a: T, b: T) => {
    const sort = (i = 0): Result => {
      const s = sorters[i](a, b);
      if (s === 0 && i < sorters.length - 1) {
        return sort(i + 1);
      } else {
        return s;
      }
    };

    return sort();
  };
