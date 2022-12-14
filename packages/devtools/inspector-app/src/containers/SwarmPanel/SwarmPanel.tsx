//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { SwarmDetails } from '@dxos/devtools-mesh';
import { useDevtools, useStream } from '@dxos/react-client';

export const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }

  const { data } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  if (!data?.length) {
    return null;
  }

  return <SwarmDetails swarms={data} />;
};
