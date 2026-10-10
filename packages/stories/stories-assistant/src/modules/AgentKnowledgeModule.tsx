//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as Agent from '@dxos/assistant/Agent';
import { Filter } from '@dxos/echo';
import * as AgentKnowledge from '@dxos/plugin-agent/AgentKnowledge';
import { useQuery } from '@dxos/react-client/echo';

/** What the space's first agent knows — its conversations and knowledge graph — beside the chats. */
export const AgentKnowledgeModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const space = Hooks.useActiveSpace();
  const [agent] = useQuery(space?.db, Filter.type(Agent.Agent));
  if (!agent) {
    return null;
  }

  return <AgentKnowledge.Root agent={agent} />;
};
