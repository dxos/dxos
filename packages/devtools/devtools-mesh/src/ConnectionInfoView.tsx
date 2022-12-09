//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Button } from '@mui/material';

import { ConnectionInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { CopyText, JsonTreeView } from '@dxos/react-components';

export interface ConnectionInfoViewProps {
  connectionInfo: ConnectionInfo;
  onReturn?: () => void;
}

// TODO(burdon): Convert to table.
export const ConnectionInfoView = ({ connectionInfo, onReturn }: ConnectionInfoViewProps) => (
  <div>
    <div>State: {connectionInfo.state}</div>
    <div>
      Session id: <CopyText value={connectionInfo.sessionId.toHex()} />
    </div>
    <div>
      Remote peer id: <CopyText value={connectionInfo.remotePeerId.toHex()} />
    </div>
    <div>Transport: {connectionInfo.transport}</div>
    <div>Protocol extensions: {connectionInfo.protocolExtensions?.join(',')}</div>
    <hr />
    <div>Connection events:</div>
    <JsonTreeView
      data={{
        ...connectionInfo.events
      }}
    />
    {onReturn && (
      <Button variant='contained' onClick={onReturn}>
        Back
      </Button>
    )}
  </div>
);
