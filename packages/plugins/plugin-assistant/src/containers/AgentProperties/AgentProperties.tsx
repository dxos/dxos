//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { useSpaceCallback } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { AgentSkillOperations } from '@dxos/assistant-toolkit';
import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { AgentProperties as AgentPropertiesComponent } from '#components';

export type AgentPropertiesProps = AppSurface.ObjectPropertiesProps<Agent.Agent>;

export const AgentProperties = ({ subject: agent }: AgentPropertiesProps) => {
  const spaceId = Obj.getDatabase(agent)?.spaceId;

  // Subscriptions live on the compiled automation, so a toggle recompiles them (per-category
  // reconcile — the schedule routine is untouched). `useSpaceCallback` takes no arguments, so the
  // next set is staged on a ref.
  const pendingSubscriptions = useRef<Ref.Ref<Obj.Unknown>[]>([]);
  const syncAutomation = useSpaceCallback(
    spaceId,
    [] as const,
    () =>
      Operation.invoke(AgentSkillOperations.SyncAutomation, {
        agent: Ref.make(agent),
        subscriptions: pendingSubscriptions.current,
      }),
    [agent],
  );

  const handleSubscriptionsChanged = useCallback(
    (subscriptions: Ref.Ref<Obj.Unknown>[]) => {
      pendingSubscriptions.current = subscriptions;
      syncAutomation().catch((err) => log.catch(err));
    },
    [syncAutomation],
  );

  return <AgentPropertiesComponent agent={agent} onSubscriptionsChanged={handleSubscriptionsChanged} />;
};

AgentProperties.displayName = 'AgentProperties';
