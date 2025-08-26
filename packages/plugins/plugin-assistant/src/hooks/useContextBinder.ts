//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { AiContextBinder } from '@dxos/assistant';
import { Filter } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';

import { Assistant } from '../types';

export const useContextBinder = (space: Space | undefined): AiContextBinder | undefined => {
  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const binder = useMemo(() => {
    const queue = chats.at(-1)?.queue.target;
    return queue && new AiContextBinder(queue);
  }, [chats]);

  return binder;
};
