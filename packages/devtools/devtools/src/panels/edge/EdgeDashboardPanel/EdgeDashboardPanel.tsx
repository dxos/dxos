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
import { PanelContainer } from '../../../components';

const RETRY_IN_IF_FAILURE = 1000; // [ms]

export const EdgeDashboardPanel = () => {
  const client = useClient();

  client.halo.queryCredentials();

  return (
    <PanelContainer classNames='flex-1 flex-row'>
      <div className='flex-1 flex-col w-50%'>
        <AgentStat status={agentState} />
    </PanelContainer>
  );
};
