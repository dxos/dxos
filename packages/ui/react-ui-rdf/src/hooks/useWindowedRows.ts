//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import { useCallback, useEffect, useRef, useState } from 'react';

import { type EntityTypeCount, type SourceError, type Window, type WindowRequest } from '../model/index.ts';

/** Rows a page holds: a request per page, enough pages for a screenful and the overscan around it. */
export const DEFAULT_PAGE_SIZE = 25;

export type WindowedRowsOptions<T, D> = {
  /** Answers one page of rows; a new function (a new filter) drops every loaded page and starts again. */
  readonly load: (request: Pick<WindowRequest, 'offset' | 'limit'>) => Effect.Effect<Window<T>, SourceError>;
  /** Loads the details of a page's rows once the page arrives (a card's facts), keyed by row id. */
  readonly details?: (items: readonly T[]) => Effect.Effect<ReadonlyMap<string, D>, SourceError>;
  readonly getId: (item: T) => string;
  readonly pageSize?: number;
};

export type WindowedRows<T, D> = {
  /** How many rows match; undefined until the first page arrives. */
  readonly total: number | undefined;
  /** Per-class counts from the first page, when the source counts them. */
  readonly types: readonly EntityTypeCount[];
  readonly error: string | undefined;
  /** The row at `index`, or undefined while its page loads. */
  readonly item: (index: number) => T | undefined;
  /** A row's details, or undefined while they load. */
  readonly detail: (id: string) => D | undefined;
  /** Every row and its details loaded so far, for lookups by id (a chosen card, a related entity). */
  readonly loaded: () => Iterable<[T, D | undefined]>;
  /** The index of the loaded row with this id, or -1 when no loaded page holds it. */
  readonly indexOf: (id: string) => number;
  /** Tells the hook which rows are in view (overscan included): it loads the pages that cover them. */
  readonly onRangeChange: (start: number, end: number) => void;
};

type State<T, D> = {
  total: number | undefined;
  types: readonly EntityTypeCount[];
  error: string | undefined;
  pages: Map<number, readonly T[]>;
  details: Map<string, D>;
};

const empty = <T, D>(): State<T, D> => ({
  total: undefined,
  types: [],
  error: undefined,
  pages: new Map(),
  details: new Map(),
});

const message = (cause: Cause.Cause<SourceError>): string => {
  const error = Cause.squash(cause);
  return error instanceof Error ? error.message : String(error);
};

/**
 * Pages a source's rows in as a virtualized list scrolls: the list reports its visible range, the hook loads the pages
 * covering it (and each page's details), caches what it loaded, and on a new `load` interrupts what is in flight and
 * forgets every page, so a stale answer never lands in the new list.
 */
export const useWindowedRows = <T, D = never>({
  load,
  details,
  getId,
  pageSize = DEFAULT_PAGE_SIZE,
}: WindowedRowsOptions<T, D>): WindowedRows<T, D> => {
  const [state, setState] = useState<State<T, D>>(empty);
  const requested = useRef(new Set<number>());
  const fibers = useRef(new Set<Fiber.Fiber<unknown, unknown>>());
  // Bumped with every new `load`: an answer for an older one is dropped.
  const generation = useRef(0);
  const latest = useRef({ load, details, getId, pageSize });
  latest.current = { load, details, getId, pageSize };

  const fetchPage = useCallback((page: number) => {
    if (requested.current.has(page)) {
      return;
    }
    requested.current.add(page);
    const run = generation.current;
    const options = latest.current;
    const apply = (update: (state: State<T, D>) => State<T, D>) =>
      Effect.sync(() => {
        if (run === generation.current) {
          setState(update);
        }
      });
    const program = options.load({ offset: page * options.pageSize, limit: options.pageSize }).pipe(
      Effect.tap((window) =>
        apply((state) => ({
          ...state,
          total: window.total,
          types: page === 0 && window.types ? window.types : state.types,
          pages: new Map(state.pages).set(page, window.items),
        })),
      ),
      Effect.flatMap((window) =>
        options.details && window.items.length > 0
          ? options.details(window.items).pipe(
              Effect.tap((loaded) =>
                apply((state) => {
                  const next = new Map(state.details);
                  for (const row of window.items) {
                    const found = loaded.get(options.getId(row));
                    if (found !== undefined) {
                      next.set(options.getId(row), found);
                    }
                  }
                  return { ...state, details: next };
                }),
              ),
            )
          : Effect.void,
      ),
      Effect.catchCause((cause) =>
        Cause.hasInterruptsOnly(cause)
          ? Effect.void
          : Effect.andThen(
              Effect.sync(() => requested.current.delete(page)),
              apply((state) => ({ ...state, error: message(cause) })),
            ),
      ),
    );
    const fiber = Effect.runFork(program);
    fibers.current.add(fiber);
    fiber.addObserver(() => fibers.current.delete(fiber));
  }, []);

  // A new source or filter: interrupt what is in flight, forget every page, and load the first for the total.
  useEffect(() => {
    generation.current++;
    for (const fiber of fibers.current) {
      Effect.runFork(Fiber.interrupt(fiber));
    }
    fibers.current.clear();
    requested.current.clear();
    setState(empty());
    fetchPage(0);
  }, [load, fetchPage]);

  useEffect(
    () => () => {
      generation.current++;
      for (const fiber of fibers.current) {
        Effect.runFork(Fiber.interrupt(fiber));
      }
    },
    [],
  );

  const onRangeChange = useCallback(
    (start: number, end: number) => {
      const size = latest.current.pageSize;
      for (let page = Math.floor(Math.max(0, start) / size); page <= Math.floor(Math.max(0, end) / size); page++) {
        fetchPage(page);
      }
    },
    [fetchPage],
  );

  const item = useCallback(
    (index: number): T | undefined => state.pages.get(Math.floor(index / pageSize))?.[index % pageSize],
    [state.pages, pageSize],
  );
  const detail = useCallback((id: string): D | undefined => state.details.get(id), [state.details]);
  const loaded = useCallback(
    function* (): Iterable<[T, D | undefined]> {
      for (const items of state.pages.values()) {
        for (const loadedItem of items) {
          yield [loadedItem, state.details.get(getId(loadedItem))];
        }
      }
    },
    [state.pages, state.details, getId],
  );

  const indexOf = useCallback(
    (id: string): number => {
      for (const [page, items] of state.pages) {
        const found = items.findIndex((candidate) => getId(candidate) === id);
        if (found >= 0) {
          return page * pageSize + found;
        }
      }
      return -1;
    },
    [state.pages, pageSize, getId],
  );

  return {
    total: state.total,
    types: state.types,
    error: state.error,
    item,
    detail,
    loaded,
    indexOf,
    onRangeChange,
  };
};
