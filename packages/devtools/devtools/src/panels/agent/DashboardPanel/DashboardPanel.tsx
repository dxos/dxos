//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

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
    const unsubscribe = client.spaces.default.listen('dxos.agent.dashboard-plugin', (data) => {
      if (data.payload.type === 'dxos.agent.dashboard.DashboardResponse') {
        setAgentState(data.payload);
      }
    });
    return () => unsubscribe();
  });

  return <JsonView data={agentState} />;
};
