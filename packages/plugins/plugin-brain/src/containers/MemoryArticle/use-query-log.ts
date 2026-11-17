//
// Copyright 2026 DXOS.org
//

import { useSyncExternalStore } from 'react';

import { type FactStoreRegistry, type SparqlQueryRecord } from '../../capabilities/fact-store.ts';

/** The space's SPARQL query log, re-rendering as each query starts and ends. */
export const useQueryLog = (registry: FactStoreRegistry, spaceId: string): readonly SparqlQueryRecord[] =>
  useSyncExternalStore(
    (listener) => registry.subscribeQueries(spaceId, listener),
    () => registry.queries(spaceId),
  );
