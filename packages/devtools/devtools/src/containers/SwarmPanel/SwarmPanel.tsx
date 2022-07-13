//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { SwarmDetails } from '@dxos/devtools-mesh';
import { SwarmInfo } from '@dxos/network-manager';
import { useDevtools, useStream } from '@dxos/react-client';

export const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  if (!data?.length) {
    return null;
  }

  // TODO(burdon): Requires cast despite subsitutions.
  return (
    <SwarmDetails swarms={data as SwarmInfo[]} />
  );
};
