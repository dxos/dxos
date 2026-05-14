//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Entity, Feed, type Filter, type Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type DXN } from '@dxos/keys';

import { useClient } from '../client';

/**
 * Reactive query against a `Feed.Feed`.
 *
 * Pass a `Feed.Feed` (e.g. resolved from `Ref(Feed.Feed)`) and a query/filter;
 * subscriptions are managed via the same machinery as `useQuery`.
 *
 * @example
 * ```ts
 * const messages = useFeedQuery(span.invocationTraceFeed?.target, Filter.everything());
 * ```
 */
export const useFeedQuery: {
  <Q extends Query.Any, O extends Entity.Entity<Query.Type<Q>> = Entity.Entity<Query.Type<Q>>>(
    feed: Feed.Feed | undefined,
    query: Q,
  ): O[];

  <F extends Filter.Any, O extends Entity.Entity<Filter.Type<F>> = Entity.Entity<Filter.Type<F>>>(
    feed: Feed.Feed | undefined,
    filter: F,
  ): O[];
} = (feed: Feed.Feed | undefined, queryOrFilter: Query.Any | Filter.Any): Entity.Any[] => {
  const dxn = feed ? Feed.getDXN(feed) : undefined;
  return useFeedQueryByDXN(dxn, queryOrFilter as any);
};

/**
 * Reactive query against a feed addressed by its DXN.
 *
 * DXN-driven counterpart to `useFeedQuery` — for debug UIs (e.g. devtools) and
 * other consumers that hold a raw feed DXN and don't have a materialized
 * `Feed.Feed` object.
 *
 * @example
 * ```ts
 * const items = useFeedQueryByDXN(feedDXN, Filter.everything());
 * ```
 */
export const useFeedQueryByDXN: {
  <Q extends Query.Any, O extends Entity.Entity<Query.Type<Q>> = Entity.Entity<Query.Type<Q>>>(
    feedDXN: DXN | undefined,
    query: Q,
  ): O[];

  <F extends Filter.Any, O extends Entity.Entity<Filter.Type<F>> = Entity.Entity<Filter.Type<F>>>(
    feedDXN: DXN | undefined,
    filter: F,
  ): O[];
} = (feedDXN: DXN | undefined, queryOrFilter: Query.Any | Filter.Any): Entity.Any[] => {
  const client = useClient();
  const dxnString = feedDXN?.toString();

  const queue = useMemo(() => {
    if (!feedDXN) {
      return undefined;
    }
    const parts = feedDXN.asQueueDXN();
    if (!parts) {
      return undefined;
    }
    return client.spaces.get(parts.spaceId)?.queues.get(feedDXN);
  }, [client, dxnString]);

  return useQuery(queue, queryOrFilter as any);
};
