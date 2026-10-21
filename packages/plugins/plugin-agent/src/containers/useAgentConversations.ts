//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import type * as Agent from '@dxos/assistant/Agent';
import * as Session from '@dxos/assistant/Session';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';

import { AgentChannels } from '#types';

/** The agent's channel list, if it has one. */
export const useAgentChannelList = (agent: Agent.Agent): AgentChannels.AgentChannels | undefined => {
  // Child-of filters rather than `.children()` traversals, which EDGE's query planner cannot run.
  const filter = useMemo(() => Filter.and(Filter.type(AgentChannels.AgentChannels), Filter.childOf(agent)), [agent]);
  // `Filter.and` widens to the child-of filter's untyped result, so the element type is restated here.
  const lists: AgentChannels.AgentChannels[] = useQuery(Obj.getDatabase(agent), filter);
  return lists.at(0);
};

/** The agent's channel conversations, in the order they started. */
export const useAgentConversations = (agent: Agent.Agent): Session.Session[] => {
  const filter = useMemo(() => Filter.and(Filter.type(Session.Session), Filter.childOf(agent)), [agent]);
  const chats: Session.Session[] = useQuery(Obj.getDatabase(agent), filter);
  // Channel chats carry their conversation key from creation, so membership alone decides the list; ULID ids sort by
  // creation, which is when the conversation's first message arrived, so they list in the order they started.
  return useMemo(
    () =>
      chats
        .filter((chat) => AgentChannels.conversationOf(chat) !== undefined)
        .sort((left, right) => left.id.localeCompare(right.id)),
    [chats],
  );
};
