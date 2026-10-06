//
// Copyright 2026 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import type * as Agent from '@dxos/assistant/Agent';

import { type Trigger } from '#types';

import { triggerRegistry } from '../triggers.ts';

const subscribe = (listener: () => void) => triggerRegistry.subscribe(listener);
const getSnapshot = () => triggerRegistry.snapshot;

/** The agent's active triggers, oldest first; they live in process memory, so this re-renders on every change. */
export const useTriggers = (agent: Agent.Agent): Trigger.Trigger[] => {
  const triggers = useSyncExternalStore(subscribe, getSnapshot);
  return useMemo(() => triggers.filter((trigger) => trigger.agent === agent.id), [triggers, agent.id]);
};
