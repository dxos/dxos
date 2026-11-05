//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import type * as Surface from '@dxos/app-framework/Surface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as AssistantChat from '@dxos/assistant/Chat';
import * as Trajectory from '@dxos/compute/Trajectory';
import { Feed, Filter, Order, Query, Scope } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/react-client/echo';
import { Timeline } from '@dxos/react-ui-trace';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { toCommits } from './trajectory-commits.ts';

/**
 * The newest chat's trajectory as a git graph beside it: a commit per event, a branch per feed branch (main, each turn,
 * each thread), merges where a thread ends.
 */
export const TrajectoryGraphModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const space = Hooks.useActiveSpace();
  const chats = useQuery(space?.db, Filter.type(AssistantChat.Chat));
  const chat = chats.at(-1);
  const [feedRef] = useObject(chat, 'feed');
  const feed = useResolveRef(feedRef);
  const feedUri = feed && Feed.getFeedUri(feed);
  // Every branch, in local order: a turn and a thread write on branches of their own.
  const query = useMemo(
    () =>
      feedUri
        ? Query.select(Filter.type(Trajectory.Event))
            .from(Scope.feed(feedUri.toString(), { walk: { branch: 'all' } }))
            .orderBy(Order.natural('asc'))
        : Query.select(Filter.nothing()),
    [feedUri?.toString()],
  );
  const events = useQuery(space?.db, query);
  const commits = useMemo(() => toCommits(events), [events]);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

  return (
    <ScrollArea.Root data-testid='trajectory-graph'>
      <ScrollArea.Viewport ref={setViewport}>
        <Timeline commits={commits} scroller={viewport} showTimestamp />
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
