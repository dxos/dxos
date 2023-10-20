//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { AgentStatus } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';
import { createProtoRpcPeer } from '@dxos/rpc';

import { JsonView, PanelContainer } from '../../../components';

const CHANNEL_NAME = 'dxos.agent.dashboard-plugin';

export const DashboardPanel = () => {
  const client = useClient();
  const [agentState, setAgentState] = useState<AgentStatus>({ status: AgentStatus.Status.OFF });

  useAsyncEffect(async () => {
    await client.spaces.isReady.wait();
    await client.spaces.default.waitUntilReady();
    log.info('DashboardPanel: client ready');

    const rpc = createProtoRpcPeer({
      requested: {
        DashboardService: schema.getService('dxos.agent.dashboard.DashboardService'),
      },
      exposed: {},
      handlers: {},
      noHandshake: true,
      port: {
        send: (message) =>
          client.spaces.default.postMessage(CHANNEL_NAME, { '@type': 'google.protobuf.Any', value: message }),
        subscribe: (callback) =>
          client.spaces.default.listen(CHANNEL_NAME, (gossipMessage) => {
            return callback(gossipMessage.payload.value);
          }),
      },
      encodingOptions: {
        preserveAny: true,
      },
    });

    log.info('DashboardPanel: rpc create');
    await rpc.open();
    log.info('DashboardPanel: rpc open');

    const stream = rpc.rpc.DashboardService.status();
    log.info('DashboardPanel: stream open');

    stream.subscribe((response) => {
      log.info('DashboardPanel: stream response', { response });

      setAgentState(response);
    });

    return () => {
      log.info('DashboardPanel: close');
      void stream.close();
      void rpc.close();
    };
  }, []);

  if (!agentState) {
    return <div>Waiting for Identity...</div>;
  }

  return (
    <PanelContainer>
      <JsonView data={agentState} />
    </PanelContainer>
  );
};
