//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { IconButton, List, ListItem } from '@material-ui/core';
import ArrowBackIos from '@material-ui/icons/ArrowBackIos';

import { ConnectionInfo } from '@dxos/network-manager';
import { TruncateCopy } from '@dxos/react-framework';

export interface ConnectionInfoViewProps {
  connectionInfo: ConnectionInfo,
  onReturn?: () => void,
}

export const ConnectionInfoView = ({ connectionInfo, onReturn }: ConnectionInfoViewProps) => (
  <div>
    <div> State: {connectionInfo.state}</div>
    <div> Session id: <TruncateCopy text={connectionInfo.sessionId.toHex()} /> </div>
    <div> Remote peer id: <TruncateCopy text={connectionInfo.remotePeerId.toHex()} /> </div>
    <div> Transport: {connectionInfo.transport}</div>
    <div> Protocol extensions: {connectionInfo.protocolExtensions.join(',')}</div>
    <hr/>
    <div>
      Connection events:
    </div>
    <List>
      {connectionInfo.events.map(event => (
        <ListItem key={JSON.stringify(event)}>
          {JSON.stringify(event)}
        </ListItem>
      ))}
    </List>
    {onReturn && (
      <IconButton size="small" onClick={onReturn} title="Back" style={{ borderRadius: 5 }}>
        <ArrowBackIos />
        Back
      </IconButton>)
    }
  </div>
);
