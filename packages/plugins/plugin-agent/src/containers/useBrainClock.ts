//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Agent from '@dxos/assistant/Agent';
import { Obj, Ref } from '@dxos/echo';

import { TriggerOperation } from '#types';

/** The longest a timer waits before asking the brain again, so a missed change to the rules is picked up. */
const MAX_WAIT = 60 * 60_000;

/**
 * Keeps the in-app brain's clock running while the agent is open: runs its due watches, then waits until
 * the brain says the clock next matters. EDGE's brain has its own alarm; for an agent hosted there this
 * finds nothing due.
 */
export const useBrainClock = (agent: Agent.Agent | undefined): void => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = agent && Obj.getDatabase(agent);

  useEffect(() => {
    if (!agent || !db) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      const { data } = await invokePromise(
        TriggerOperation.RunDue,
        { agent: Ref.make(agent) },
        { spaceId: db.spaceId },
      );
      if (cancelled) {
        return;
      }
      const due = data?.nextDueAt ? Date.parse(data.nextDueAt) - Date.now() : MAX_WAIT;
      timer = setTimeout(() => void run(), Math.min(Math.max(due, 1_000), MAX_WAIT));
    };
    void run();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [agent, db, invokePromise]);
};
