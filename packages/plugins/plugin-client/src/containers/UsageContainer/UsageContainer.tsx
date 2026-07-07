//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { type GetProfileUsageResponse } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-ui';

import { useHubHttpClient } from '../../hooks';
import { UsageView, type UsageViewState } from './UsageView';

/** State + payload kept together so `ready` always carries data (mirrors the discriminated `UsageViewProps`). */
type UsageFetchState =
  | {
      state: Exclude<UsageViewState, 'ready'>;
    }
  | {
      state: 'ready';
      data: GetProfileUsageResponse;
    };

/**
 * Fetches rolling-window profile usage from the hub service and renders it.
 * Connected wrapper around the presentational {@link UsageView}.
 */
export const UsageContainer = () => {
  const hubHttp = useHubHttpClient();
  const [fetchState, setFetchState] = useState<UsageFetchState>({ state: 'loading' });
  const [lastUpdated, setLastUpdated] = useState<number | undefined>();
  const [refreshCount, setRefreshCount] = useState(0);

  useAsyncEffect(async () => {
    if (!hubHttp) {
      setFetchState({ state: 'unavailable' });
      return;
    }
    // Keep prior data visible while refetching; only show the loading state on first load.
    setFetchState((previous) => (previous.state === 'ready' ? previous : { state: 'loading' }));
    try {
      const result = await hubHttp.getProfileUsage(new Context());
      setFetchState({ state: 'ready', data: result });
      setLastUpdated(Date.now());
    } catch (err) {
      log.catch(err);
      setFetchState({ state: 'error' });
    }
  }, [hubHttp, refreshCount]);

  const handleRefresh = useCallback(() => setRefreshCount((count) => count + 1), []);

  return <UsageView {...fetchState} lastUpdated={lastUpdated} onRefresh={handleRefresh} />;
};
