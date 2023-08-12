//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Tree, TreeItem } from '@dxos/aurora';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { PanelContainer } from '../../components';
import { ConnectionInfoView } from '../../components/ConnectionInfoView';

const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  const [selectedItem, setSelectedItem] = useState<string | undefined>();

  // {
  //   (data ?? []).map((swarm) => ({
  //     id: swarm.id.toHex(),
  //     Element: <TreeItemText primary={humanize(swarm.topic)} secondary={swarm.label} />,
  //     Icon: ShareNetwork,
  //     items: swarm.connections?.map((connection) => ({
  //       id: connection.sessionId.toHex(),
  //       Element: <TreeItemText primary={humanize(connection.remotePeerId)} secondary={connection.state} />,
  //       Icon:
  //         {
  //           CONNECTED: LinkSimple,
  //           CLOSED: LinkBreak,
  //         }[connection.state] ?? LinkSimpleBreak,
  //       value: connection,
  //     })),
  //   }));
  // }

  return (
    <PanelContainer className='flex-row'>
      <div className='flex flex-col w-1/3 mt-2 overflow-auto border-r'>
        <Tree.Root>
          {(data ?? []).map((swarm) => (
            <TreeItem.Root key={swarm.id.toHex()}>
              <TreeItem.Heading>{swarm.label}</TreeItem.Heading>
            </TreeItem.Root>
          ))}
        </Tree.Root>
        {/* <Tree */}
        {/*  onSelect={(item: any) => setSelectedItem(item.id)} */}
        {/*  selected={selectedItem} */}
        {/* /> */}
      </div>
      {selectedItem && (
        <div className='flex flex-1 flex-col w-2/3 overflow-auto'>
          <ConnectionInfoView
            connectionInfo={data
              ?.flatMap((swarm) => swarm.connections)
              .find((connection) => connection?.sessionId.toHex() === selectedItem)}
          />
        </div>
      )}
    </PanelContainer>
  );
};

export default SwarmPanel;
