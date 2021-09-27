//
// Copyright 2021 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { SwarmInfo } from '@dxos/network-manager';
import { SwarmDetails as SwarmComponent } from '@dxos/network-devtools';

import { useDevtoolsHost } from "../contexts";

const SwarmDetails = () => {
  const devtoolsHost = useDevtoolsHost();
  const [swarms, setSwarms] = useState<SwarmInfo[]>([]);

  useEffect(() => {
    const stream = devtoolsHost.SubscribeToSwarmInfo({});

    stream.subscribe(msg => {
      setSwarms((msg.data as unknown) as SwarmInfo[]);
    }, () => {});

    return stream.close
  }, []);

  return <SwarmComponent swarms={swarms}/>
};

export default SwarmDetails;
