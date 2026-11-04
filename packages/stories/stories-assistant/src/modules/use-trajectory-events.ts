//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as AssistantChat from '@dxos/assistant/Chat';
import * as Trajectory from '@dxos/compute/Trajectory';
import { Feed, Filter, Order, Query, Scope } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/react-client/echo';

/**
 * Every trajectory event of the active space's newest chat, on every branch, in local order: a turn and a thread write
 * on branches of their own, and a reducer folds in local order.
 */
export const useTrajectoryEvents = (): Trajectory.Event[] => {
  const space = Hooks.useActiveSpace();
  const chats = useQuery(space?.db, Filter.type(AssistantChat.Chat));
  const chat = chats.at(-1);
  const [feedRef] = useObject(chat, 'feed');
  const feed = useResolveRef(feedRef);
  const feedUri = feed && Feed.getFeedUri(feed);
  const query = useMemo(
    () =>
      feedUri
        ? Query.select(Filter.type(Trajectory.Event))
            .from(Scope.feed(feedUri.toString(), { walk: { branch: 'all' } }))
            .orderBy(Order.natural('asc'))
        : Query.select(Filter.nothing()),
    [feedUri?.toString()],
  );
  return useQuery(space?.db, query);
};
