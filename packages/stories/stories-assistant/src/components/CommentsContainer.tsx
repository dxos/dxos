//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { Assistant, useContextBinder } from '@dxos/plugin-assistant';
import { Filter, useQuery } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const CommentsContainer = ({ space }: ComponentProps) => {
  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const binder = useContextBinder(chats.at(-1));
  const object = binder?.objects.value[0]?.target;
  const data = useMemo(() => ({ subject: 'comments', companionTo: object }), [object]);
  if (!object) {
    return null;
  }

  return <Surface role='article' data={data} />;
};
