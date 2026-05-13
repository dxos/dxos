//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Entity, Feed, type Filter, type Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';

import { useClient } from '../client';

/**
 * Reactive query against a `Feed.Feed`.
 *
 * Bridges the Feed schema layer to the queue-shaped underlying storage.
 * Pass a `Feed.Feed` (e.g. resolved from `Ref(Feed.Feed)`) and a query/filter;
 * subscriptions are managed via the same machinery as `useQuery`.
 *
 * @example
 * ```ts
 * const messages = useFeedQuery(span.invocationTraceQueue?.target, Filter.everything());
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
  const client = useClient();
  const dxnString = feed ? Feed.getQueueDxn(feed)?.toString() : undefined;

  const queue = useMemo(() => {
    if (!feed) {
      return undefined;
    }
    const dxn = Feed.getQueueDxn(feed);
    const parts = dxn?.asQueueDXN();
    if (!dxn || !parts) {
      return undefined;
    }
    return client.spaces.get(parts.spaceId)?.queues.get(dxn);
  }, [client, dxnString]);

  return useQuery(queue, queryOrFilter as any);
};
