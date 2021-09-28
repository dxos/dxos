//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { IconButton, List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import ArrowBackIos from '@material-ui/icons/ArrowBackIos';
import InfoIcon from '@material-ui/icons/Info';

import { PublicKey } from '@dxos/crypto';
import { ConnectionState, SwarmInfo } from '@dxos/network-manager';
import { TruncateCopy } from '@dxos/react-framework';

export interface SwarmInfoViewProps {
  swarmInfo: SwarmInfo
  onConnectionClick?: (sessionId: PublicKey) => void,
  onReturn?: () => void,
}

export const SwarmInfoView = ({ swarmInfo, onConnectionClick, onReturn }: SwarmInfoViewProps) => (
  <div>
    <div> Topic: <TruncateCopy text={swarmInfo.topic.toHex()} /> </div>
    <div> Label: {swarmInfo.label ? <TruncateCopy text={swarmInfo.label} /> : 'No label'}</div>
    <div> Active: {swarmInfo.isActive ? 'yes' : 'no'} </div>
    <div> Active connection count: {swarmInfo.connections.filter(c => c.state !== ConnectionState.CLOSED).length}</div>
    <div> Total connection count: {swarmInfo.connections.length}</div>
    <hr/>
    <div> Connections: </div>
    <List>
      {swarmInfo.connections.map(connection => (
        <ListItem key={connection.sessionId.toHex()}>
          <ListItemText>
            <TruncateCopy text={connection.remotePeerId.toHex()} />
          </ListItemText>
          <ListItemIcon>
            <IconButton onClick={() => onConnectionClick?.(connection.sessionId)} title='Details'>
              <InfoIcon />
            </IconButton>
          </ListItemIcon>
        </ListItem>
      ))}
    </List>
    {onReturn && (
      <IconButton size='small' onClick={onReturn} title={'Back'} style={{ borderRadius: 5 }}>
        <ArrowBackIos />
        Back
      </IconButton>)
    }
  </div>
);
