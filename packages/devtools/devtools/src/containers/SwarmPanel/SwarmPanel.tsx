//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { SwarmDetails } from '@dxos/devtools-mesh';
import { useDevtools, useStream } from '@dxos/react-client';
import { SubscribeToSwarmInfoResponse } from '@dxos/protocols/proto/dxos/devtools';

export const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  if (!data?.length) {
    return null;
  }

  // TODO(burdon): Requires cast despite subsitutions.
  return (
    <SwarmDetails swarms={data as SubscribeToSwarmInfoResponse.SwarmInfo[]} />
  );
};
