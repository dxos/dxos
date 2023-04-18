//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { useDevtools, useStream } from '@dxos/react-client';

import { SwarmDetails } from '../../components';
import { ConnectionInfo, SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { TreeView, TreeViewItem } from '@dxos/react-components';
import { LinkBreak, LinkSimple, LinkSimpleBreak, LinkSimpleHorizontal, ShareNetwork } from '@phosphor-icons/react';
import { humanize } from '@dxos/util';
import { ConnectionInfoView } from '../../components/ConnectionInfoView';


const getSwarmInfoTree = (swarms: SwarmInfo[]): TreeViewItem[] =>
  swarms.map(swarm => ({
    id: swarm.id.toHex(),
    Element: (
      <div className='flex gap-2 overflow-hidden whitespace-nowrap'>
        <span>{humanize(swarm.topic)}</span>
        <span className='text-gray-400'>{swarm.label}</span>
      </div>
    ),
    Icon: ShareNetwork,
    items: swarm.connections?.map(connection => ({
      id: connection.sessionId.toHex(),
      Element: (
        <div className='flex gap-2 overflow-hidden whitespace-nowrap'>
          <span>{humanize(connection.remotePeerId)}</span>
          <span className='text-gray-400'>{connection.state}</span>
        </div>
      ),
      Icon: {
        CONNECTED: LinkSimple,
        CLOSED: LinkBreak
      }[connection.state] ?? LinkSimpleBreak,
      value: connection
    }))
  }))

const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  const [selectedItem, setSelectedItem] = useState<ConnectionInfo | undefined>();

  return (
    <div className='flex h-full overflow-hidden'>
      <div className='flex flex-col w-1/3 overflow-auto border-r'>
        <TreeView
          items={getSwarmInfoTree(data ?? [])}
          slots={{
            value: {
              className: 'overflow-hidden text-gray-400 truncate pl-2'
            }
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
    </div>
  )
};

export default SwarmPanel;
