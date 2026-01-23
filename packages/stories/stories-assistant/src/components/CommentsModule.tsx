//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { Assistant, useContextBinder } from '@dxos/plugin-assistant';
import { Filter, useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const CommentsModule = ({ space }: ComponentProps) => {
  const chats = useQuery(space.db, Filter.type(Assistant.Chat));
  const context = useContextBinder(chats.at(-1)?.queue.target);
  const object = context?.objects.value[0];
  const data = useMemo(() => ({ subject: 'comments', companionTo: object }), [object]);
  if (!object) {
    return null;
  }

  return <Surface role='article' data={data} />;
};
