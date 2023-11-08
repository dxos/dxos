//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { type PublicKey } from '@dxos/keys';
import { type SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';

import { ConnectionInfoView } from './ConnectionInfoView';
import { SwarmInfoView } from './SwarmInfo';
import { SwarmTable } from './SwarmTable';

interface SwarmDetailsProps {
  swarms: SwarmInfo[];
}

// TODO(burdon): Not used?
export const SwarmDetails = ({ swarms }: SwarmDetailsProps) => {
  const [swarmId, setSwarmId] = useState<PublicKey | undefined>();
  const [sessionId, setSessionId] = useState<PublicKey | undefined>();
  if (swarmId && sessionId) {
    const connection = swarms
      .find((swarm) => swarm.id.equals(swarmId))
      ?.connections?.find((conn) => conn.sessionId.equals(sessionId));
    if (connection) {
      return <ConnectionInfoView connection={connection} />;
    } else {
      return <div>Connection not found.</div>;
    }
  }

  if (swarmId) {
    const swarmInfo = swarms.find((swarm) => swarm.id.equals(swarmId));
    if (swarmInfo) {
      return (
        <SwarmInfoView
          swarmInfo={swarmInfo}
          onConnectionClick={(id) => setSessionId(id)}
          onReturn={() => setSwarmId(undefined)}
        />
      );
    } else {
      return <div>Swarm not found.</div>;
    }
  }

  return <SwarmTable swarms={swarms} onClick={(id) => setSwarmId(id)} />;
};
