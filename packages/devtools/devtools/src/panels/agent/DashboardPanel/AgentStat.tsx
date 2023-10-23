//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AgentStatus } from '@dxos/protocols/proto/dxos/agent/dashboard';

export type AgentStatusProps = {
  status: AgentStatus;
};

export const AgentStat = ({ status }: AgentStatusProps) => {
  return (
    <div>
      <div>Agent Status: {status.status}</div>
    </div>
  );
};
