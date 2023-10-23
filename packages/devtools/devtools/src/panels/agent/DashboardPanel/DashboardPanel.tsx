//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { log } from '@dxos/log';
import { AgentStatus } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';

import { AgentStat } from './AgentStat';
import { PluginList } from './PluginList';
import { DashboardProxy } from './dashboard-proxy';
import { PanelContainer } from '../../../components';

export const DashboardPanel = () => {
  const client = useClient();
  const [dashboard, setDashboard] = useState<DashboardProxy>();
  const [agentState, setAgentState] = useState<AgentStatus>({ status: AgentStatus.Status.OFF });

  useAsyncEffect(async () => {
    await client.spaces.isReady.wait();
    await client.spaces.default.waitUntilReady();

    const dashboard = new DashboardProxy({ client });
    await dashboard.open();
    setDashboard(dashboard);

    const stream = dashboard.services.DashboardService.status();

    stream.subscribe((response) => {
      setAgentState(response);
    });

    return () => {
      void stream.close();
      void dashboard.close();
    };
  }, []);

  const togglePlugin = async (pluginId: string) => {
    const config = agentState?.plugins?.find((plugin) => plugin.pluginId === pluginId)?.pluginConfig;
    if (!config || !dashboard) {
      log.info('skip toggle');
      return;
    }

    log.info('toggle plugin', { pluginId, config });

    await dashboard?.services.DashboardService.changePluginConfig({
      pluginId,
      pluginConfig: { ...config, enabled: !config.enabled },
    });
  };

  return (
    <PanelContainer className='flex-1 flex-row'>
      <div className='flex-1 flex-col w-50%'>
        <AgentStat status={agentState} />
      </div>
      {agentState.plugins ? (
        <PluginList plugins={agentState.plugins} togglePlugin={togglePlugin} />
      ) : (
        <div>No plugins are running in agent</div>
      )}
    </PanelContainer>
  );
};
