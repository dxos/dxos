//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Agent from '@dxos/assistant/Agent';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { AgentOperation } from '#types';

/**
 * Finishes, for the agent's creator, the join after provisioning when its background retries all failed: each time the
 * agent opens, `op:ensureIdentity` checks locally and asks EDGE only when something is missing. An agent without an
 * identity is left alone, since provisioning it now would rename its brain.
 */
export const useIdentityRepair = (agent: Agent.Agent | undefined): void => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = agent && Obj.getDatabase(agent);
  const did = agent?.did;

  useEffect(() => {
    if (!agent || !db || !did) {
      return;
    }
    void invokePromise(AgentOperation.EnsureIdentity, { agent: Ref.make(agent) }, { spaceId: db.spaceId }).then(
      ({ error }) => {
        if (error) {
          log.warn('agent membership not repaired', { error });
        }
      },
    );
  }, [agent, db, did, invokePromise]);
};
