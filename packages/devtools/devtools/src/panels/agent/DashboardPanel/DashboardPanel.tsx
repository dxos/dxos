//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { AgentStatus } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';

import { AgentStat } from './AgentStat';
import { DashboardProxy } from './dashboard-proxy';
import { PanelContainer } from '../../../components';

const RETRY_IN_IF_FAILURE = 1000; // [ms]

export const DashboardPanel = () => {
  const client = useClient();
  const [agentState, setAgentState] = useState<AgentStatus>({ status: AgentStatus.Status.OFF });

  useAsyncEffect(async () => {
    await client.spaces.isReady.wait();
    await client.spaces.default.waitUntilReady();

    const dashboard = new DashboardProxy({ client });
    await dashboard.open();

    const context = new Context();
    const subscribe = () => {
      const stream = dashboard.services.DashboardService.status();

      stream.subscribe((response) => {
        setAgentState(response);
        // NOTE: Turn off retries if, we received first message.
        void context.dispose();
      });
      return stream;
    };

    let stream = subscribe();

    // NOTE: RPC is opened through unreliable Gossip protocol, so we need to retry stream creation, if some message got lost, and agent did not opened stream.
    scheduleTaskInterval(
      context,
      async () => {
        log.info('DashboardPanel: retrying to open stream with agent');
        await stream.close();
        stream = subscribe();
      },
      RETRY_IN_IF_FAILURE,
    );

    return () => {
      void stream.close();
      void dashboard.close();
      void context.dispose();
    };
  }, []);

  return (
    <PanelContainer classNames='flex-1 flex-row'>
      <div className='flex-1 flex-col w-50%'>
        <AgentStat status={agentState} />
      </div>
    </PanelContainer>
  );
};
