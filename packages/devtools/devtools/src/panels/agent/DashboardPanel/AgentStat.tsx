//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AgentStatus } from '@dxos/protocols/proto/dxos/agent/dashboard';

import { JsonView } from '../../../components';

export type AgentStatusProps = {
  status: AgentStatus;
};

export const AgentStat = ({ status }: AgentStatusProps) => {
  return (
    <div className='flex-1 justify-center'>
      <div>Agent Status: {status.status === AgentStatus.Status.ON ? 'Online' : 'Offline'}</div>
      <JsonView data={status} />
    </div>
  );
};
