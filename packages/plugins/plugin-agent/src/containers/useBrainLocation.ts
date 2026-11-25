//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Agent from '@dxos/compute/Agent';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';

/** Whether the agent's brain is EDGE's: an agent with a chat running there keeps its brain there too. */
export const useRemoteBrain = (agent: Agent.Agent): boolean => {
  const db = Obj.getDatabase(agent);
  const chatFilter = useMemo(() => Filter.and(Filter.type(Agent.Session), Filter.childOf(agent)), [agent]);
  const chats: Agent.Session[] = useQuery(db, chatFilter);
  return chats.some((chat) => Agent.sessionLocation(chat) === 'edge');
};
