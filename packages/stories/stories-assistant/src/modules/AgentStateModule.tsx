//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import * as Agent from '@dxos/assistant/Agent';
import { Filter } from '@dxos/echo';
import { AgentState } from '@dxos/plugin-agent/AgentState';
import { type Space, useQuery } from '@dxos/react-client/echo';

/** The state of the space's first agent — its mode, what it tracks and its knowledge graph — beside the chat. */
export const AgentStateModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <AgentStateModuleContainer space={space} />;
};

const AgentStateModuleContainer = ({ space }: { space: Space }) => {
  const [agent] = useQuery(space.db, Filter.type(Agent.Agent));
  return agent ? <AgentState agent={agent} /> : null;
};
