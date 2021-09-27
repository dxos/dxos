//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/crypto';
import { ConnectionState, SwarmInfo } from '@dxos/network-manager';

export interface SwarmInfoViewProps {
  swarmInfo: SwarmInfo
  onConnectionClick?: (sessionId: PublicKey) => void
}

export const SwarmInfoView = ({ swarmInfo, onConnectionClick }: SwarmInfoViewProps) => (
  <div>
    <div>topic: {swarmInfo.topic.toHex()}</div>
    <div>label: {swarmInfo.label}</div>
    <div>isActive: {swarmInfo.isActive ? 'true' : 'false'}</div>
    <div>active connection count: {swarmInfo.connections.filter(c => c.state !== ConnectionState.CLOSED).length}</div>
    <div>total connection count: {swarmInfo.connections.length}</div>
    <hr/>
    <div>
      {swarmInfo.connections.map(connection => (
        <div key={connection.sessionId.toHex()} onClick={() => onConnectionClick?.(connection.sessionId)}>{connection.state} {connection.protocolExtensions.join(',')} {connection.remotePeerId.toHex()}</div>
      ))}
    </div>
  </div>
);
