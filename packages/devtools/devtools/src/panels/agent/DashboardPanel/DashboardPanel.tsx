//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { log } from '@dxos/log';
import { DashboardResponse } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';

import { JsonView } from '../../../components';

export const DashboardPanel = () => {
  const client = useClient();
  const [agentState, setAgentState] = useState<DashboardResponse>();

  useAsyncEffect(async () => {
    await client.spaces.isReady.wait();
    await client.spaces.default.waitUntilReady();
    setAgentState({ status: DashboardResponse.Status.OFF });
    const unsubscribe = client.spaces.default.listen('dxos.agent.dashboard-plugin', (data) => {
      if (data.payload['@type'] === 'dxos.agent.dashboard.DashboardResponse') {
        log.info('response', { data });
        setAgentState(data.payload);
      }
    });
    log.info('request');
    await client.spaces.default.postMessage('dxos.agent.dashboard-plugin', {
      '@type': 'dxos.agent.dashboard.DashboardRequest',
    });
    return () => unsubscribe();
  }, []);

  if (!agentState) {
    return <div>Waiting for Identity...</div>;
  }

  return <JsonView data={agentState} />;
};
