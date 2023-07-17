//
// Copyright 2021 DXOS.org
//

import { Upload } from '@phosphor-icons/react';
import React from 'react';

import { ConnectionInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { TreeView } from '@dxos/react-appkit';

import { DetailsTable } from './DetailsTable';
import { JsonView } from './JsonView';
import { TreeItemText } from './TreeItemText';

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
      streams: (
        <TreeView
          items={
            connectionInfo.streams?.map((streamStat) => ({
              id: streamStat.id.toString(),
              Icon: Upload,
              Element: (
                <TreeItemText
                  primary={`| Up: ${streamStat.bytesSent} | Down: ${streamStat.bytesReceived} |`}
                  secondary={streamStat.tag}
                />
              ),
            })) ?? []
          }
          expanded={connectionInfo.streams?.map((streamStat) => streamStat.id.toString())}
          slots={{
            value: {
              className: 'overflow-hidden text-gray-400 truncate pl-2',
            },
          }}
        />
      ),
    }}
  />
);
