//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ConnectionInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { Button } from '@dxos/react-components';

import { JsonView } from './JsonView';

export interface ConnectionInfoViewProps {
  connectionInfo: ConnectionInfo;
  onReturn?: () => void;
}

// TODO(burdon): Convert to table.
export const ConnectionInfoView = ({ connectionInfo, onReturn }: ConnectionInfoViewProps) => (
  <div>
    <div>State: {connectionInfo.state}</div>
    <div>Session id: {connectionInfo.sessionId.toHex()}</div>
    <div>Remote peer id: {connectionInfo.remotePeerId.toHex()}</div>
    <div>Transport: {connectionInfo.transport}</div>
    <div>Protocol extensions: {connectionInfo.protocolExtensions?.join(',')}</div>
    <hr />
    <div>Connection events:</div>
    <JsonView
      data={{
        events: connectionInfo.events
      }}
    />
    {onReturn && <Button onClick={onReturn}>Back</Button>}
  </div>
);
