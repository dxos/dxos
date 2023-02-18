//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { useDevtools, useStream } from '@dxos/react-client';

import { SwarmDetails } from '../../components';

const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  if (!data?.length) {
    return null;
  }

  return <SwarmDetails swarms={data} />;
};

export default SwarmPanel;
