//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

/**
 * Optimistic transform applied over every source emission until the entry retires; must be pure
 * and stable under re-application, since the emission that carries the real write is still
 * transformed once before the entry retires.
 */
export type ApplyEntry<T> = {
  readonly apply: (rows: readonly T[]) => readonly T[];
};

/**
 * Pins the rows matching `retain` (captured from the source at registration) whenever a source
 * emission drops them — the `leaving` state a filtered view shows during an undo grace window.
 */
export type RetainEntry<T> = {
  readonly retain: (row: T) => boolean;
  /**
   * Logical row identity for presence checks; defaults to reference equality, which is only
   * safe for identity-stable rows (live ECHO objects) — a source that re-emits fresh objects
   * per row must supply the key or a pinned row would duplicate its re-emitted twin.
   */
  readonly keyOf?: (row: T) => unknown;
  /** Grace window after {@link Handle.commit}; without it the pin holds until {@link Handle.revert}. */
  readonly graceMs?: number;
};

export type Entry<T> = ApplyEntry<T> | RetainEntry<T>;

/**
 * Lifecycle of one overlay entry. Entries are keyed and settle individually because operation
 * completion order is not issue order (see the invoker concurrency contract).
 */
export type Handle = {
  /**
   * The operation settled successfully. An apply entry retires on the NEXT source emission — the
   * one carrying the write; retiring on settle alone would resurface the stale order while the
   * query emit lags the promise. A retain entry starts its grace window instead.
   */
  readonly commit: () => void;
  /** Drop the entry immediately: the operation failed (auto-revert), or an explicit undo/release. */
  readonly revert: () => void;
};

export type Overlay<T> = {
  /** Source rows with every live entry applied, in entry registration order. */
  readonly atom: Atom.Atom<readonly T[]>;
  /** Register an overlay entry ahead of an operation dispatch; emits synchronously. */
  readonly mutate: (entry: Entry<T>) => Handle;
  /** Whether the latest emission contains `row` only because a retain entry pins it. */
  readonly isLeaving: (row: T) => boolean;
};

type EntryState<T> = {
  readonly entry: Entry<T>;
  settled: boolean;
  readonly pinned?: readonly { row: T; index: number }[];
};

/**
 * Overlay of ordered optimistic entries over a reactive row source, so a mutation routed through
 * an async operation renders its effect on the very next frame instead of after the source
 * round-trip. Query-agnostic: the source is any atom of rows. Distinct from `Atom.optimistic`,
 * which swaps in a single whole value and retires it by refreshing the source at settle — for a
 * push-based query source the refresh recomputes from the same stale snapshot, re-introducing the
 * jump this overlay exists to remove.
 */
export const make = <T>(source: Atom.Atom<readonly T[]>): Overlay<T> => {
  let nextKey = 0;
  const entries = new Map<number, EntryState<T>>();
  let sourceRows: readonly T[] = [];
  let leaving = new Set<T>();
  // setSelf bridges captured per mount, so `mutate` can emit without holding a registry.
  const pushers = new Set<() => void>();

  const reduce = (): readonly T[] => {
    let rows = sourceRows;
    const nextLeaving = new Set<T>();
    for (const state of entries.values()) {
      if ('apply' in state.entry) {
        rows = state.entry.apply(rows);
      } else if (state.pinned) {
        const keyOf = state.entry.keyOf ?? ((row: T) => row);
        const present = new Set(rows.map(keyOf));
        const missing = state.pinned.filter(({ row }) => !present.has(keyOf(row)));
        if (missing.length > 0) {
          const patched = [...rows];
          for (const { row, index } of missing) {
            patched.splice(Math.min(index, patched.length), 0, row);
            nextLeaving.add(row);
          }
          rows = patched;
        }
      }
    }
    leaving = nextLeaving;
    return rows;
  };

  const notify = () => pushers.forEach((push) => push());

  const atom = Atom.make((get: Atom.AtomContext): readonly T[] => {
    sourceRows = get.once(source);
    get.subscribe(source, (rows) => {
      sourceRows = rows;
      // A source emission is the retirement edge: settled apply entries drop here, never earlier.
      for (const [key, state] of entries) {
        if (state.settled) {
          entries.delete(key);
        }
      }
      get.setSelf(reduce());
    });
    const push = () => get.setSelf(reduce());
    pushers.add(push);
    get.addFinalizer(() => pushers.delete(push));
    return reduce();
  });

  const mutate = (entry: Entry<T>): Handle => {
    const key = nextKey++;
    const state: EntryState<T> = {
      entry,
      settled: false,
      ...('retain' in entry
        ? { pinned: sourceRows.flatMap((row, index) => (entry.retain(row) ? [{ row, index }] : [])) }
        : {}),
    };
    entries.set(key, state);
    notify();
    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    const drop = () => {
      if (graceTimer !== undefined) {
        clearTimeout(graceTimer);
        graceTimer = undefined;
      }
      if (entries.delete(key)) {
        notify();
      }
    };
    return {
      commit: () => {
        if (!entries.has(key)) {
          return;
        }
        if ('retain' in entry) {
          if (entry.graceMs !== undefined && graceTimer === undefined) {
            graceTimer = setTimeout(drop, entry.graceMs);
          }
        } else {
          state.settled = true;
        }
      },
      revert: drop,
    };
  };

  return { atom, mutate, isLeaving: (row) => leaving.has(row) };
};
