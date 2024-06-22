//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { scheduleMicroTask, scheduleTaskInterval } from '@dxos/async';
import { type Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { AgentStatus } from '@dxos/protocols/proto/dxos/agent/dashboard';
import { useClient } from '@dxos/react-client';

import { AgentStat } from './AgentStat';
import { DashboardProxy } from './dashboard-proxy';
import { PanelContainer } from '../../../components';

const RETRY_IN_IF_FAILURE = 1000; // [ms]

export const DashboardPanel = () => {
  const client = useClient();
  const [agentState, setAgentState] = useState<AgentStatus>({ status: AgentStatus.Status.OFF });

  useEffect(() => {
    const context = new Context();

    let dashboard: DashboardProxy;
    let stream: Stream<AgentStatus>;

    scheduleMicroTask(context, async () => {
      await client.spaces.isReady.wait();
      await client.spaces.default.waitUntilReady();

      dashboard = new DashboardProxy({ client });
      await dashboard.open();

      const subContext = context.derive();

      const subscribe = async (): Promise<Stream<AgentStatus>> => {
        const stream = dashboard.services.DashboardService.status();

        stream.subscribe((response: AgentStatus) => {
          setAgentState(response);
          // NOTE: Turn off retries if, we received first message.
          void subContext.dispose();
        });
        return stream;
      };

      stream = await subscribe();

      // NOTE: RPC is opened through unreliable Gossip protocol, so we need to retry stream creation, if some message got lost, and agent did not opened stream.
      scheduleTaskInterval(
        subContext,
        async () => {
          log.info('DashboardPanel: retrying to open stream with agent');
          await stream.close();
          stream = await subscribe();
        },
        RETRY_IN_IF_FAILURE,
      );
    });
    return () => {
      void context.dispose();
      void stream?.close();
      void dashboard?.close();
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
