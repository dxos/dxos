//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Button, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';

import { PublicKey } from '@dxos/keys';
import { ConnectionState } from '@dxos/network-manager';
import { SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { CopyText } from '@dxos/react-components-deprecated';

export interface SwarmInfoViewProps {
  swarmInfo: SwarmInfo;
  onConnectionClick?: (sessionId: PublicKey) => void;
  onReturn?: () => void;
}

// TODO(burdon): Convert to table.
export const SwarmInfoView = ({ swarmInfo, onConnectionClick, onReturn }: SwarmInfoViewProps) => (
  <div>
    <div>
      Topic: <CopyText value={swarmInfo.topic.toHex()} />
    </div>
    <div>Label: {swarmInfo.label ? <CopyText value={swarmInfo.label} /> : 'No label'}</div>
    <div>Active: {swarmInfo.isActive ? 'yes' : 'no'}</div>
    <div>
      Active connection count: {swarmInfo.connections?.filter((c) => c.state !== ConnectionState.CLOSED).length}
    </div>
    <div>Total connection count: {swarmInfo.connections?.length}</div>
    <hr />
    <div>Connections:</div>
    <List>
      {swarmInfo.connections?.map((connection) => (
        <ListItem key={connection.sessionId.toHex()}>
          <ListItemText>
            <CopyText value={connection.remotePeerId.toHex()} />
          </ListItemText>
          <ListItemIcon>
            <Button variant='contained' onClick={() => onConnectionClick?.(connection.sessionId)} title='Details'>
              Details
            </Button>
          </ListItemIcon>
        </ListItem>
      ))}
    </List>
    {onReturn && (
      <Button variant='contained' onClick={onReturn} title='Back'>
        Back
      </Button>
    )}
  </div>
);
