//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as Agent from '@dxos/assistant/Agent';

import { BrainStore as BrainStoreComponent } from '#components';

import { useBrainStore } from '../useBrainStore.ts';

export type BrainStoreProps = {
  role?: string;
  agent: Agent.Agent;
};

/** A debug view of the agent's brain store: its facts, rules, their matching format and its outboxes, as held. */
export const BrainStore = ({ role, agent }: BrainStoreProps) => {
  const { inspection, error } = useBrainStore(agent);
  return <BrainStoreComponent role={role} inspection={inspection} error={error} />;
};

BrainStore.displayName = 'BrainStore';
