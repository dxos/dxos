//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Feed, Filter, Order, Query } from '@dxos/echo';
import { Assistant } from '@dxos/plugin-assistant/types';
import { type Queue, useQuery } from '@dxos/react-client/echo';
import { Timeline, useExecutionGraph } from '@dxos/react-ui-components';

import { type ComponentProps } from './types';

export const ExecutionGraphModule = ({ space, traceQueue }: ComponentProps & { traceQueue?: Queue }) => {
  // Order by insertion (Chat has no timestamp field); take the most recently inserted chat.
  const chats = useQuery(space.db, Query.select(Filter.type(Assistant.Chat)).orderBy(Order.natural));
  const feedTarget = chats.at(-1)?.feed?.target;
  const feedDxn = feedTarget ? Feed.getQueueDxn(feedTarget) : undefined;
  const queue = traceQueue ?? (feedDxn ? space.queues.get(feedDxn) : undefined);
  const { branches, commits } = useExecutionGraph(queue);

  return (
    <div className='flex flex-col h-full'>
      <Timeline branches={branches} commits={commits} />
    </div>
  );
};
