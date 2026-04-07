//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { Feed } from '@dxos/echo';
import { Assistant, useContextBinder } from '@dxos/plugin-assistant';
import { Filter, useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const CommentsModule = ({ space }: ComponentProps) => {
  const chats = useQuery(space.db, Filter.type(Assistant.Chat));
  const feedTarget = chats.at(-1)?.feed.target;
  const queueDxn = feedTarget ? Feed.getQueueDxn(feedTarget) : undefined;
  const queue = queueDxn ? space.queues.get(queueDxn) : undefined;
  const context = useContextBinder(queue);
  const object = context?.getObjects()[0];
  const data = useMemo(() => ({ subject: 'comments', companionTo: object }), [object]);
  if (!object) {
    return null;
  }

  return <Surface.Surface role='article' data={data} />;
};
