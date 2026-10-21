//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Agent from '@dxos/assistant/Agent';
import * as Session from '@dxos/assistant/Session';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';

/** Whether the agent's brain is EDGE's: an agent with a chat running there keeps its brain there too. */
export const useRemoteBrain = (agent: Agent.Agent): boolean => {
  const db = Obj.getDatabase(agent);
  const chatFilter = useMemo(() => Filter.and(Filter.type(Session.Session), Filter.childOf(agent)), [agent]);
  const chats: Session.Session[] = useQuery(db, chatFilter);
  return chats.some((chat) => Agent.chatLocation(chat) === 'edge');
};
