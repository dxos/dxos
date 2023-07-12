//
// Copyright 2021 DXOS.org
//

import { LinkBreak, LinkSimple, LinkSimpleBreak, ShareNetwork } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { ConnectionInfo, SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { TreeView, TreeViewItem } from '@dxos/react-appkit';
import { useDevtools, useStream } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { PanelContainer } from '../../components';
import { ConnectionInfoView } from '../../components/ConnectionInfoView';
import { TreeItemText } from '../../components/TreeItemText';

const getSwarmInfoTree = (swarms: SwarmInfo[]): TreeViewItem[] =>
  swarms.map((swarm) => ({
    id: swarm.id.toHex(),
    Element: <TreeItemText primary={humanize(swarm.topic)} secondary={swarm.label} />,
    Icon: ShareNetwork,
    items: swarm.connections?.map((connection) => ({
      id: connection.sessionId.toHex(),
      Element: <TreeItemText primary={humanize(connection.remotePeerId)} secondary={connection.state} />,
      Icon:
        {
          CONNECTED: LinkSimple,
          CLOSED: LinkBreak,
        }[connection.state] ?? LinkSimpleBreak,
      value: connection,
    })),
  }));

const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  const [selectedItem, setSelectedItem] = useState<ConnectionInfo | undefined>();

  return (
    <PanelContainer className='flex-row'>
      <div className='flex flex-col w-1/3 mt-2 overflow-auto border-r'>
        <TreeView
          items={getSwarmInfoTree(data ?? [])}
          slots={{
            value: {
              className: 'overflow-hidden text-gray-400 truncate pl-2',
            },
          }}
          onSelect={(item: any) => setSelectedItem(item.value)}
          selected={selectedItem?.sessionId.toHex()}
        />
      </div>
      {selectedItem && (
        <div className='flex flex-1 flex-col w-2/3 overflow-auto'>
          <ConnectionInfoView connectionInfo={selectedItem} />
        </div>
      )}
    </PanelContainer>
  );
};

export default SwarmPanel;
