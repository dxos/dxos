//
// Copyright 2026 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';

import { type Database, type Query } from '@dxos/echo';

import { type PaginationResult, type UsePaginationOptions, createPaginationStore } from './usePagination';

/**
 * Atom-native pagination over the store backing {@link usePagination}, for atom computations and
 * controllers constructed outside React. The returned atom yields a {@link PaginationResult}
 * bundle whose callbacks stay referentially stable across store rebuilds.
 *
 * The query comes in as an atom because pagination usually follows a derived query (filter text,
 * sort direction); a change is keyed on the query AST — not object identity — so an upstream
 * recompute yielding an equivalent query does not reset the page window. On a genuine identity
 * change the new store is seeded with the previously displayed page, mirroring the hook's
 * flash-empty prevention.
 *
 * The element type `O` must be named by the caller: a dynamic query atom can switch shape (e.g.
 * between an aggregate and a plain selection), which defeats inference from a single query type.
 */
export const paginationAtom = <O>(
  resource: Database.Queryable | undefined,
  queryAtom: Atom.Atom<Query.Any>,
  options?: UsePaginationOptions,
): Atom.Atom<PaginationResult<O>> => {
  type Store = ReturnType<typeof createPaginationStore<Query.Any, O>>;
  let store: Store | undefined;
  let storeKey: string | undefined;
  let previousItems: O[] = [];

  // Stable delegates: consumers (e.g. a virtualizer) hold the bundle's callbacks across rebuilds.
  const getNext = () => store?.getNext();
  const getPrevious = () => store?.getPrevious();
  const jumpToHead = () => store?.jumpToHead();

  const toResult = (snapshot: {
    items: O[];
    skip: number;
    limit: number;
    isLoading: boolean;
  }): PaginationResult<O> => ({
    items: snapshot.items,
    getNext,
    getPrevious,
    hasMore: snapshot.items.length >= snapshot.limit,
    isLoading: snapshot.isLoading,
    atHead: snapshot.skip === 0,
    jumpToHead,
  });

  return Atom.make((get) => {
    const query = get(queryAtom);
    if (query.ast.type !== 'limit') {
      throw new TypeError('paginationAtom requires the query to carry .limit(pageSize).');
    }
    if (query.ast.query.type === 'skip') {
      throw new TypeError('paginationAtom manages .skip() internally -- do not include it in the query.');
    }
    const pageSize = query.ast.limit;
    const maxWindowSize = options?.maxWindowSize ?? pageSize * 10;

    const key = JSON.stringify(query.ast);
    if (!store || storeKey !== key) {
      store = createPaginationStore(resource, query.ast.query, pageSize, maxWindowSize, previousItems);
      storeKey = key;
    }
    store.setMaxWindowSize(maxWindowSize);

    const current = store;
    const unsubscribe = current.subscribe(() => {
      const snapshot = current.getSnapshot();
      previousItems = snapshot.items;
      get.setSelf(toResult(snapshot));
    });
    get.addFinalizer(() => unsubscribe());

    const snapshot = current.getSnapshot();
    previousItems = snapshot.items;
    return toResult(snapshot);
  });
};
