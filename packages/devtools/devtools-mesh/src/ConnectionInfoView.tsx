//
// Copyright 2021 DXOS.org
//

import React from 'react';

import ArrowBackIos from '@mui/icons-material/ArrowBackIos';
import { IconButton, List, ListItem } from '@mui/material';

import { SubscribeToSwarmInfoResponse } from '@dxos/protocols/proto/dxos/devtools';
import { CopyText, JsonTreeView } from '@dxos/react-components';

export interface ConnectionInfoViewProps {
  connectionInfo: SubscribeToSwarmInfoResponse.SwarmInfo.ConnectionInfo
  onReturn?: () => void
}

// TODO(burdon): Convert to table.
export const ConnectionInfoView = ({ connectionInfo, onReturn }: ConnectionInfoViewProps) => (
  <div>
    <div>State: {connectionInfo.state}</div>
    <div>Session id: <CopyText value={connectionInfo.sessionId.toHex()} /></div>
    <div>Remote peer id: <CopyText value={connectionInfo.remotePeerId.toHex()} /></div>
    <div>Transport: {connectionInfo.transport}</div>
    <div>Protocol extensions: {connectionInfo.protocolExtensions?.join(',')}</div>
    <hr />
    <div>
      Connection events:
    </div>
    <JsonTreeView data={{
      ...connectionInfo.events
        }} />
    {onReturn && (
      <IconButton size='small' onClick={onReturn} title='Back' style={{ borderRadius: 5 }}>
        <ArrowBackIos />
        Back
      </IconButton>
    )
    }
  </div>
);
