//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { Context } from '@dxos/context';
import { type TriggersDispatcherStatus } from '@dxos/edge-client';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';

const POLL_INTERVAL_MS = 5_000;

export type EdgeTriggersDispatcherStatusState = {
  status: TriggersDispatcherStatus | undefined;
  error: boolean;
  loading: boolean;
};

/**
 * Polls Edge TriggersDispatcher status for a space while enabled.
 * Uses {@link FunctionsServiceClient} so requests are authenticated like other edge trigger calls.
 */
export const useEdgeTriggersDispatcherStatus = (
  spaceId: SpaceId | undefined,
  enabled: boolean,
): EdgeTriggersDispatcherStatusState => {
  const client = useClient();
  const identity = useIdentity();
  const functionsServiceClient = useMemo(() => FunctionsServiceClient.fromClient(client), [client]);
  const [status, setStatus] = useState<TriggersDispatcherStatus | undefined>();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !spaceId || !identity) {
      setStatus(undefined);
      setError(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const result = await functionsServiceClient.getTriggersDispatcherStatus(Context.default(), spaceId);
        if (!cancelled) {
          setStatus(result);
          setError(false);
        }
      } catch (err) {
        log.catch(err);
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchStatus();
    const interval = setInterval(() => void fetchStatus(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, functionsServiceClient, identity, spaceId]);

  return { status, error, loading };
};
