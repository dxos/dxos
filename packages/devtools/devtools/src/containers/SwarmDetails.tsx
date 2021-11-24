//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { SwarmDetails as SwarmComponent } from '@dxos/devtools-mesh';
import { SwarmInfo } from '@dxos/network-manager';
import { useClient } from '@dxos/react-client';

import { useStream } from '../hooks';

export const SwarmDetails = () => {
  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;
  const swarms = useStream(() => devtoolsHost.SubscribeToSwarmInfo({}));

  if (!swarms?.data) {
    return <div>Loading swarms info...</div>;
  }

  if (swarms.data.length === 0) {
    return <div>No swarms to display.</div>;
  }

  return (
    <SwarmComponent swarms={swarms?.data as SwarmInfo[]} />
  );
};
