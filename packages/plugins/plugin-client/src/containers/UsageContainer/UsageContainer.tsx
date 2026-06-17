//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { type GetProfileUsageResponse } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-ui';

import { useHubHttpClient } from '../../state/use-hub-http';
import { UsageView, type UsageViewState } from './UsageView';

/**
 * Fetches rolling-window profile usage from the hub service and renders it.
 * Connected wrapper around the presentational {@link UsageView}.
 */
export const UsageContainer = () => {
  const hubHttp = useHubHttpClient();
  const [state, setState] = useState<UsageViewState>('loading');
  const [data, setData] = useState<GetProfileUsageResponse | undefined>();
  const [lastUpdated, setLastUpdated] = useState<number | undefined>();
  const [refreshCount, setRefreshCount] = useState(0);

  useAsyncEffect(async () => {
    if (!hubHttp) {
      setState('unavailable');
      return;
    }
    // Keep prior data visible while refetching; only show the skeleton on first load.
    setState((previous) => (previous === 'ready' ? previous : 'loading'));
    try {
      const result = await hubHttp.getProfileUsage(new Context());
      setData(result);
      setLastUpdated(Date.now());
      setState('ready');
    } catch (err) {
      log.catch(err);
      setState('error');
    }
  }, [hubHttp, refreshCount]);

  const handleRefresh = useCallback(() => setRefreshCount((count) => count + 1), []);

  return <UsageView state={state} data={data} lastUpdated={lastUpdated} onRefresh={handleRefresh} />;
};
