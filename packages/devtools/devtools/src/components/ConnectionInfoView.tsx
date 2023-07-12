//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { ConnectionInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';

import { DetailsTable } from './DetailsTable';
import { JsonView } from './JsonView';

export interface ConnectionInfoViewProps {
  connectionInfo: ConnectionInfo;
  /**
   * @deprecated
   */
  onReturn?: () => void;
}

// TODO(burdon): Convert to table.
export const ConnectionInfoView = ({ connectionInfo, onReturn }: ConnectionInfoViewProps) => (
  <DetailsTable
    object={{
      state: connectionInfo.state,
      sessionId: connectionInfo.sessionId.toHex(),
      remotePeerId: connectionInfo.remotePeerId.toHex(),
      transport: connectionInfo.transport,
      protocolExtensions: connectionInfo.protocolExtensions?.join(','),
      events: (
        <JsonView
          data={{
            events: connectionInfo.events,
          }}
        />
      ),
    }}
  />
);
