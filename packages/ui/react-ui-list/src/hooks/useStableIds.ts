//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useState } from 'react';

import { arrayMove } from '@dxos/util';

/** A value paired with the id generated for its position. */
export type StableEntry<T> = { id: string; value: T };

export type UseStableIdsReturn<T> = {
  /** The values with their ids, in order; pass to a list's `items`. */
  items: readonly StableEntry<T>[];
  getId: (entry: StableEntry<T>) => string;
  /** The values with one moved, its id moving with it; persist the result. */
  move: (from: number, to: number) => T[];
  /** The values without the one at `index`; persist the result. */
  remove: (index: number) => T[];
  /** The values with `value` inserted at `index` under a new id; persist the result. */
  insert: (index: number, value: T) => T[];
};

let counter = 0;
const createId = () => `stable-${++counter}`;

type Ids<T> = { values: readonly T[]; ids: readonly string[] };

/**
 * Ids for a plain array whose values carry none (AUDIT §6 point 43), kept beside it: an edit made through `move`,
 * `remove` or `insert` carries the ids with the values, so a reordered row keeps its identity (and its React state)
 * once the caller persists the returned array. An array that changes any other way keeps the ids by position.
 */
export const useStableIds = <T>(values: readonly T[]): UseStableIdsReturn<T> => {
  const [current, setCurrent] = useState<Ids<T>>(() => ({ values, ids: values.map(() => createId()) }));
  // The edit the caller is expected to persist next.
  const [expected, setExpected] = useState<Ids<T> | null>(null);

  let ids = current.ids;
  if (current.values !== values) {
    // A persisted copy (an ECHO array, a structured clone) has new elements, so an edit is matched by length.
    ids =
      expected && expected.values.length === values.length
        ? expected.ids
        : values.map((_, index) => current.ids[index] ?? createId());
    setCurrent({ values, ids });
    if (expected) {
      setExpected(null);
    }
  }

  const items = useMemo(() => values.map((value, index) => ({ id: ids[index], value })), [values, ids]);

  const getId = useCallback((entry: StableEntry<T>) => entry.id, []);

  const move = useCallback(
    (from: number, to: number) => {
      const nextValues = [...values];
      const nextIds = [...ids];
      arrayMove(nextValues, from, to);
      arrayMove(nextIds, from, to);
      setExpected({ values: nextValues, ids: nextIds });
      return nextValues;
    },
    [values, ids],
  );

  const remove = useCallback(
    (index: number) => {
      const nextValues = values.filter((_, position) => position !== index);
      setExpected({ values: nextValues, ids: ids.filter((_, position) => position !== index) });
      return nextValues;
    },
    [values, ids],
  );

  const insert = useCallback(
    (index: number, value: T) => {
      const nextValues = [...values];
      const nextIds = [...ids];
      nextValues.splice(index, 0, value);
      nextIds.splice(index, 0, createId());
      setExpected({ values: nextValues, ids: nextIds });
      return nextValues;
    },
    [values, ids],
  );

  return { items, getId, move, remove, insert };
};
