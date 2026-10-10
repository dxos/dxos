//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import type * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
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

/** The agent's channel conversations, newest first. */
export const useAgentConversations = (agent: Agent.Agent): Chat.Chat[] => {
  const filter = useMemo(() => Filter.and(Filter.type(Chat.Chat), Filter.childOf(agent)), [agent]);
  const chats: Chat.Chat[] = useQuery(Obj.getDatabase(agent), filter);
  // Channel chats carry their conversation key from creation, so membership alone decides the list; ULID ids sort by age.
  return useMemo(
    () =>
      chats
        .filter((chat) => AgentChannels.conversationOf(chat) !== undefined)
        .sort((left, right) => right.id.localeCompare(left.id)),
    [chats],
  );
};
