//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { SwarmDetails as SwarmComponent } from '@dxos/network-devtools';
import { SwarmInfo } from '@dxos/network-manager';

import { useDevtoolsHost } from '../contexts';
import { useStream } from '../hooks';

const SwarmDetails = () => {
  const devtoolsHost = useDevtoolsHost();
  const swarms = useStream(() => devtoolsHost.SubscribeToSwarmInfo({}));

  if (!swarms?.data) {
    return <div> Loading swarms info... </div>;
  }

  return <SwarmComponent swarms={swarms?.data as SwarmInfo[]}/>;
};

export default SwarmDetails;
