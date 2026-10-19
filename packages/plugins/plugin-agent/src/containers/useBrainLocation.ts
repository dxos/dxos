//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';

/** Whether the agent's brain is EDGE's: an agent with a chat running there keeps its brain there too. */
export const useRemoteBrain = (agent: Agent.Agent): boolean => {
  const db = Obj.getDatabase(agent);
  const chatFilter = useMemo(() => Filter.and(Filter.type(Chat.Chat), Filter.childOf(agent)), [agent]);
  const chats: Chat.Chat[] = useQuery(db, chatFilter);
  return chats.some((chat) => Agent.chatLocation(chat) === 'edge');
};
