//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { SwarmDetails } from '@dxos/devtools-mesh';
import { SwarmInfo } from '@dxos/network-manager';
import { useClient } from '@dxos/react-client';

import { useStream } from '../hooks';

export const SwarmPanel = () => {
  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;
  const { data } = useStream(() => devtoolsHost.subscribeToSwarmInfo({})) ?? {};
  if (!data?.length) {
    return null;
  }

  // TODO(burdon): Requires cast despite subsitutions.
  return (
    <SwarmDetails swarms={data as SwarmInfo[]} />
  );
};
