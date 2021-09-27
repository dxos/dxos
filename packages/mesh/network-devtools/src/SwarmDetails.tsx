//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { SwarmInfo } from '@dxos/network-manager';

import { IconButton } from '@material-ui/core';
import InfoIcon from '@material-ui/icons/Info';
import ArrowBackIos from '@material-ui/icons/ArrowBackIos';

import { SwarmInfoView } from './SwarmInfo';
import SwarmTable from './SwarmTable';
import { ConnectionInfoView } from './ConnectionInfoView';

interface SwarmDetailsProps {
  swarms: SwarmInfo[]
}

export const SwarmDetails = ({ swarms } : SwarmDetailsProps) => {
  const [swarmId, setSwarmId] = useState<PublicKey | undefined>();
  const [sessionId, setSessionId] = useState<PublicKey | undefined>();

  const handleReturn = () => {
    if (sessionId) {
      setSessionId(undefined);
    } else {
      setSwarmId(undefined);
    } 
  }

  if (swarmId && sessionId) {
    const connectionInfo = swarms
      .find(swarm => swarm.id.equals(swarmId))
      ?.connections.find(conn => conn.sessionId.equals(sessionId));
    if (connectionInfo) {
      return <ConnectionInfoView 
              connectionInfo={connectionInfo}
              onReturn={() => setSessionId(undefined)}
            />
    } else {
      return (
        <div> 
          Connection not found.
        </div>
      );
    }
  }

  if (swarmId) {
    const swarmInfo = swarms.find(swarm => swarm.id.equals(swarmId));
    if (swarmInfo) {
      return <SwarmInfoView 
              swarmInfo={swarmInfo} 
              onConnectionClick={id => setSessionId(id)}
              onReturn={() => setSwarmId(undefined)}
            />
    } else {
      return (
        <div> 
          Swarm not found.
        </div>
      );
    }
  }

  return (
    <SwarmTable swarms={swarms} onClick={id => setSwarmId(id)}/>
  );
};

export default SwarmDetails;
