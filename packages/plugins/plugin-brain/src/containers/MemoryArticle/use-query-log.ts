//
// Copyright 2026 DXOS.org
//

import { useSyncExternalStore } from 'react';

import { type FactStoreRegistry } from '../../capabilities/fact-store-registry.ts';
import type * as QueryLog from '../../query-log.ts';

/** The space's SPARQL query log, re-rendering as each query starts and ends. */
export const useQueryLog = (registry: FactStoreRegistry, spaceId: string): readonly QueryLog.Entry[] =>
  useSyncExternalStore(
    (listener) => registry.subscribeQueries(spaceId, listener),
    () => registry.queries(spaceId),
  );
