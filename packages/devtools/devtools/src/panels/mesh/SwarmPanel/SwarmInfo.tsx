//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { type PublicKey } from '@dxos/keys';
import { ConnectionState } from '@dxos/network-manager';
import { type SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { Button } from '@dxos/react-ui';

export interface SwarmInfoViewProps {
  swarmInfo: SwarmInfo;
  onConnectionClick?: (sessionId: PublicKey) => void;
  onReturn?: () => void;
}

// TODO(burdon): Convert to table.
export const SwarmInfoView = ({ swarmInfo, onConnectionClick, onReturn }: SwarmInfoViewProps) => (
  <div>
    <div>Topic: {swarmInfo.topic.toHex()}</div>
    <div>Label: {swarmInfo.label ? swarmInfo.label : 'No label'}</div>
    <div>Active: {swarmInfo.isActive ? 'yes' : 'no'}</div>
    <div>
      Active connection count: {swarmInfo.connections?.filter((c) => c.state !== ConnectionState.CLOSED).length}
    </div>
    <div>Total connection count: {swarmInfo.connections?.length}</div>
    <hr />
    <div>Connections:</div>
    <div className='grow overflow-hidden'>
      {swarmInfo.connections?.map((connection) => (
        <div key={connection.sessionId.toHex()} className='grow overflow-hidden'>
          <div className='inline-flex is-[100]'>{connection.remotePeerId.toHex()}</div>
          <div className='inline-flex m-1'>
            <Button onClick={() => onConnectionClick?.(connection.sessionId)} title='Details'>
              Details
            </Button>
          </div>
        </div>
      ))}
    </div>
    {onReturn && (
      <Button onClick={onReturn} title='Back'>
        Back
      </Button>
    )}
  </div>
);
