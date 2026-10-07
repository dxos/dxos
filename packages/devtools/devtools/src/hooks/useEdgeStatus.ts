//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Context } from '@dxos/context';
import { type EdgeStatus } from '@dxos/protocols';
import { useClient } from '@dxos/react-client';
import { SpaceState, useSpaces, useSyncState } from '@dxos/react-client/echo';

/** Upper bound on waiting for replication before querying anyway, so a space that never connects is still reported. */
const STARTUP_TIMEOUT = 15_000;

/**
 * The edge HTTP health report, fetched once every ready space replicates with EDGE and on demand.
 * EDGE flags a device the router sees but the space's replicator has no session for, so querying
 * during startup reports a spurious red flag for every space.
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

  // An EDGE peer appears in a space's sync state only after EDGE answers on that space's replication session.
  const replicating = spaces
    .filter((space) => space.state.get() === SpaceState.SPACE_READY)
    .every((space) => syncState[space.id] !== undefined);
  const started = replicating || timedOut;

  useEffect(() => {
    if (!started) {
      return;
    }

    const ctx = new Context();
    scheduleTask(ctx, async () => {
      client.edge.http.setIdentity(createEdgeIdentity(client));
      setStatus(await client.edge.http.getStatus(Context.default()));
    });
    return () => {
      void ctx.dispose();
    };
  }, [client, started]);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(status, null, 2));
  }, [status]);

  return { status, refresh, copy };
};
