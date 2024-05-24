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
// TODO(burdon): Factor out.
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

// TODO(burdon): Factor out.
export const intersection = <A, B = A>(a: A[], b: B[], comparator: Comparator<A, B>): A[] =>
  a.filter((a) => b.find((b) => comparator(a, b)) !== undefined);
