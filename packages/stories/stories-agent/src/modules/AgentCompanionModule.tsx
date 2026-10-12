//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as Agent from '@dxos/assistant/Agent';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';

export type AgentCompanionModuleData = {
  /** The companion variant, e.g. `discord`, `activity` or `brain`. */
  variant: string;
};

/**
 * One of the space's first agent's companions, dispatched to the plugin surface that contributes it, so the story
 * shows exactly what the app shows beside the agent.
 */
export const AgentCompanionModule = ({ data }: Surface.ComponentProps<AgentCompanionModuleData>) => {
  const space = Hooks.useActiveSpace();
  const [agent] = useQuery(space?.db, Filter.type(Agent.Agent));
  const variant = data?.variant;
  const surfaceData = useMemo(
    () => (agent && variant ? { subject: variant, companionTo: agent } : undefined),
    [agent, variant],
  );
  if (!surfaceData) {
    return null;
  }

  return <Surface.Surface type={AppSurface.Article} data={surfaceData} />;
};
