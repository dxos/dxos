//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { type EdgeStatus } from '@dxos/protocols';
import { useClient } from '@dxos/react-client';
import { SpaceState, useSpaces, useSyncState } from '@dxos/react-client/echo';

import { pollWithBackoff } from './poll.ts';

/** Upper bound on waiting for replication before querying anyway, so a space that never connects is still reported. */
const STARTUP_TIMEOUT = 15_000;

const INITIAL_POLL_DELAY = 1_000;

const MAX_POLL_DELAY = 60_000;

/** Space states that never open a replication session, so never gain an EDGE sync peer. */
const NON_REPLICATING_STATES: SpaceState[] = [
  SpaceState.SPACE_INACTIVE,
  SpaceState.SPACE_DELETED,
  SpaceState.SPACE_ERROR,
  SpaceState.SPACE_REQUIRES_MIGRATION,
];

/**
 * The edge HTTP health report, fetched once every active space replicates with EDGE, then re-fetched
 * with backoff while it reports issues, and on demand.
 */
export const useEdgeStatus = (): { status?: EdgeStatus; refresh: () => void; copy: () => void } => {
  const client = useClient();
  const spaces = useSpaces({ all: true });
  const syncState = useSyncState();
  const [timedOut, setTimedOut] = useState(false);
  const [status, setStatus] = useState<EdgeStatus>();
  const refresh = useCallback(() => {
    void client.edge.http.getStatus(Context.default()).then(setStatus);
  }, [client]);

  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, () => setTimedOut(true), STARTUP_TIMEOUT);
    return () => {
      void ctx.dispose();
    };
  }, []);

  // An EDGE peer appears in a space's sync state only after EDGE answers on that space's replication session;
  // spaces still opening are waited on too, since they replicate once ready.
  const replicating = spaces
    .filter((space) => !NON_REPLICATING_STATES.includes(space.state.get()))
    .every((space) => syncState[space.id] !== undefined);
  const started = replicating || timedOut;

  useEffect(() => {
    if (!started) {
      return;
    }

    const ctx = new Context();
    client.edge.http.setIdentity(createEdgeIdentity(client));
    // Startup issues are often transient (EDGE still catching up), so keep re-querying until the report is clean.
    pollWithBackoff(
      ctx,
      async () => {
        try {
          const next = await client.edge.http.getStatus(ctx);
          if (!ctx.disposed) {
            setStatus(next);
          }
          return next.problems.length > 0;
        } catch (err) {
          log.warn('failed to fetch edge status', { err });
          return true;
        }
      },
      { initialDelay: INITIAL_POLL_DELAY, maxDelay: MAX_POLL_DELAY },
    );
    return () => {
      void ctx.dispose();
    };
  }, [client, started]);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(status, null, 2));
  }, [status]);

  return { status, refresh, copy };
};
