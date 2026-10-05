//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as Agent from '@dxos/assistant/Agent';
import { Filter } from '@dxos/echo';
import { AgentState } from '@dxos/plugin-agent/AgentState';
import { useQuery } from '@dxos/react-client/echo';

/** The state of the space's first agent — its mode, what it tracks and its knowledge graph — beside the chat. */
export const AgentStateModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const space = Hooks.useActiveSpace();
  const [agent] = useQuery(space?.db, Filter.type(Agent.Agent));
  if (!agent) {
    return null;
  }

  return <AgentState agent={agent} />;
};
