//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as Agent from '@dxos/assistant/Agent';
import { Filter } from '@dxos/echo';
import * as AgentCompanion from '@dxos/plugin-agent/AgentCompanion';
import { useQuery } from '@dxos/react-client/echo';

/**
 * The space's first agent's Activity companion — its channels (with each backend's settings, e.g. the
 * Discord bot's start/stop and status), skills and conversations — dispatched to plugin-agent's surface.
 */
export const AgentActivityModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const space = Hooks.useActiveSpace();
  const [agent] = useQuery(space?.db, Filter.type(Agent.Agent));
  const data = useMemo(() => (agent ? { subject: AgentCompanion.ACTIVITY, companionTo: agent } : undefined), [agent]);
  if (!data) {
    return null;
  }

  return <Surface.Surface type={AppSurface.Article} data={data} />;
};
