//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { AiContextBinder } from '@dxos/assistant';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';

import { Assistant } from '../../types';

export const useBinder = (space: Space) => {
  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const binder = useMemo(() => {
    const queue = chats.at(-1)?.queue.target;
    return queue && new AiContextBinder(queue);
  }, [chats]);

  return binder;
};
