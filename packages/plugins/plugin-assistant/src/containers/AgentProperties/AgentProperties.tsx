//
// Copyright 2025 DXOS.org
//

import React, { useEffect } from 'react';

import { useSpaceCallback } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Agent, AgentWizardOperations } from '@dxos/assistant-toolkit';
import { Operation } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { AgentProperties as AgentPropertiesComponent } from '#components';

export type AgentPropertiesProps = AppSurface.ObjectPropertiesProps<Agent.Agent>;

export const AgentProperties = ({ subject: agent }: AgentPropertiesProps) => {
  const spaceId = Obj.getDatabase(agent)?.spaceId;

  // TODO(burdon): Factor this out?
  const syncTriggers = useSpaceCallback(
    spaceId,
    [] as const,
    () => Operation.invoke(AgentWizardOperations.SyncTriggers, { agent: Ref.make(agent) }),
    [agent],
  );

  // Sync triggers whenever the agent mutates (e.g., subscriptions change).
  useEffect(() => {
    if (!spaceId) {
      return;
    }

    return Obj.subscribe(agent, () => {
      queueMicrotask(() => {
        syncTriggers().catch((err) => log.catch(err));
      });
    });
  }, [spaceId, agent, syncTriggers]);

  return <AgentPropertiesComponent agent={agent} />;
};

AgentProperties.displayName = 'AgentProperties';
