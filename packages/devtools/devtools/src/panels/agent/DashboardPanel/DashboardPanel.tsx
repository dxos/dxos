//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { AgentStatus, type DashboardService } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';
import { type ProtoRpcPeer, createProtoRpcPeer } from '@dxos/rpc';

import { AgentStat } from './AgentStat';
import { PluginList } from './PluginList';
import { PanelContainer } from '../../../components';

const CHANNEL_NAME = 'dxos.agent.dashboard-plugin';

export const DashboardPanel = () => {
  const client = useClient();
  const [rpc, setRpc] = useState<ProtoRpcPeer<{ DashboardService: DashboardService }>>();
  const [agentState, setAgentState] = useState<AgentStatus>({ status: AgentStatus.Status.OFF });

  useAsyncEffect(async () => {
    await client.spaces.isReady.wait();
    await client.spaces.default.waitUntilReady();
    log.info('DashboardPanel: client ready');

    setRpc(
      createProtoRpcPeer({
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
      }),
    );
  }, []);

  useAsyncEffect(async () => {
    log.info('DashboardPanel: rpc create');
    await rpc?.open();
    log.info('DashboardPanel: rpc open');

    const stream = rpc?.rpc.DashboardService.status();
    log.info('DashboardPanel: stream open');

    stream?.subscribe((response) => {
      log.info('DashboardPanel: stream response', { response });

      setAgentState(response);
    });

    return () => {
      log.info('DashboardPanel: close');
      void stream?.close();
      void rpc?.close();
    };
  }, [rpc]);

  const togglePlugin = async (pluginId: string) => {
    const config = agentState?.plugins?.find((plugin) => plugin.pluginId === pluginId)?.pluginConfig;
    if (!config || !rpc) {
      log.info('skip toggle');
      return;
    }

    log.info('toggle plugin', { pluginId, config });

    await rpc.rpc.DashboardService.changePluginConfig({
      pluginId,
      pluginConfig: { ...config, enabled: !config.enabled },
    });
  };

  return (
    <PanelContainer>
      <AgentStat status={agentState} />
      {agentState.plugins ? (
        <PluginList plugins={agentState.plugins} togglePlugin={togglePlugin} />
      ) : (
        <div>No plugins are running in agent</div>
      )}
    </PanelContainer>
  );
};
