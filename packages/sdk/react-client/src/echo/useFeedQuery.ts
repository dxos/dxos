//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Entity, Feed, type Filter, type Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EchoId } from '@dxos/keys';

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
  const echoId = feed ? Feed.getQueueDxn(feed) : undefined;

  const queue = useMemo(() => {
    if (!feed || !echoId) {
      return undefined;
    }
    const spaceId = EchoId.getSpaceId(echoId);
    if (!spaceId) {
      return undefined;
    }
    return client.spaces.get(spaceId)?.queues.get(echoId);
  }, [client, echoId]);

  return useQuery(queue, queryOrFilter as any);
};
