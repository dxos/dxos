//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Context } from '@dxos/context';
import { type EdgeStatus } from '@dxos/protocols';
import { useClient } from '@dxos/react-client';

/** The edge HTTP health report, fetched on mount and on demand. */
export const useEdgeStatus = (): { status?: EdgeStatus; refresh: () => void; copy: () => void } => {
  const client = useClient();
  const [status, setStatus] = useState<EdgeStatus>();
  const refresh = useCallback(() => {
    void client.edge.http.getStatus(Context.default()).then(setStatus);
  }, [client]);

  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      client.edge.http.setIdentity(createEdgeIdentity(client));
      setStatus(await client.edge.http.getStatus(Context.default()));
    });
    return () => {
      void ctx.dispose();
    };
  }, [client]);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(status, null, 2));
  }, [status]);

  return { status, refresh, copy };
};
