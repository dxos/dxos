//
// Copyright 2024 DXOS.org
//

export type Comparator<A, B = A> = (a: A, b: B) => boolean;

export type DiffResult<A, B = A> = {
  added: B[];
  updated: B[];
  removed: A[];
};

/**
 * Compute diff between two arrays.
 * @param previous
 * @param next
 * @param comparator
 */
export const diff = <A, B = A>(
  previous: readonly A[],
  next: readonly B[],
  comparator: Comparator<A, B>,
): DiffResult<A, B> => {
  const remaining = [...previous];
  const result: DiffResult<A, B> = {
    added: [],
    updated: [],
    removed: remaining,
  };

  // TODO(burdon): Mark and sweep.
  for (const object of next) {
    const index = remaining.findIndex((item) => comparator(item, object));
    if (index === -1) {
      result.added.push(object);
    } else {
      result.updated.push(object);
      remaining.splice(index, 1);
    }
  }

  return result;
};

export const intersection = <A, B = A>(a: A[], b: B[], comparator: Comparator<A, B>): A[] =>
  a.filter((a) => b.find((b) => comparator(a, b)) !== undefined);

/**
 * Returns a new array with only the first instance of each unique item
 * based on a specified property.
 *
 * @typeProp T - The type of items in the input array.
 * @param array - The array to filter for distinct items.
 * @param key - The property key to determine uniqueness for each item.
 * @returns A new array with only distinct items based on the specified property.
 */
export const distinctBy = <T, K>(array: T[], selector: (item: T) => K): T[] => {
  const seenKeys = new Set<K>();
  return array.filter((item) => {
    const key = selector(item);

    if (seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
};

/**
 * Remove elements from array.
 * @param array
 * @param test
 * @returns removed elements.
 */
export const removeBy = <T>(array: T[], test: (element: T, index: number) => boolean): T[] => {
  const removed: T[] = [];
  for (let i = array.length - 1; i >= 0; i--) {
    if (test(array[i], i)) {
      removed.push(...array.splice(i, 1));
    }
  }

  return removed;
};

/**
 * Splits an array based on a type guard predicate function.
 * Infers the output tuple types from the guard function.
 */
export const partition = <T>(array: T[], guard: (item: T, index: number, array: T[]) => boolean): [T[], T[]] => {
  return array.reduce<[T[], T[]]>(
    ([accepted, rejected], item, index, array) =>
      guard(item, index, array) ? [[...accepted, item], rejected] : [accepted, [...rejected, item]],
    [[], []],
  );
};

/**
 * Returns elements that exist in all provided arrays based on a selector function.
 *
 * @param arrays - Arrays to intersect.
 * @param selector - Function to extract the comparison value from each element.
 * @returns Array containing elements from the first array that exist in all other arrays.
 */
export const intersectBy = <T, K>(arrays: T[][], selector: (item: T) => K): T[] => {
  if (arrays.length === 0) {
    return [];
  }

  if (arrays.length === 1) {
    return [...arrays[0]];
  }

  const [first, ...rest] = arrays;

  // Create lookup maps for all other arrays.
  const lookups = rest.map((array) => {
    const map = new Map<K, T>();
    for (const item of array) {
      map.set(selector(item), item);
    }
    return map;
  });

  // Keep items from first array that exist in all other arrays.
  return first.filter((item) => {
    const key = selector(item);
    return lookups.every((lookup) => lookup.has(key));
  });
};

export const coerceArray = <T>(arr: T | T[] | undefined): T[] => {
  if (arr === undefined) {
    return [];
  }
  return Array.isArray(arr) ? arr : [arr];
};
