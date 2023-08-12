//
// Copyright 2021 DXOS.org
//

import { Check } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { getSize, mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { Table, TableColumn } from '@dxos/mosaic';
import { SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { PanelContainer, ConnectionInfoView } from '../../components';

const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  const [sessionId, setSessionId] = useState<PublicKey | undefined>();

  // TODO(burdon): Table.
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

  // TODO(burdon): Show connections.
  const items = data?.flatMap((swarm) => swarm) ?? [];
  const columns: TableColumn<SwarmInfo>[] = [
    {
      Header: 'Swarm',
      Cell: ({ value }: any) => <span className='font-mono text-sm'>{value.truncate()}</span>,
      width: 80,
      accessor: ({ id }) => id,
    },
    {
      Header: 'Topic',
      Cell: ({ value }: any) => <span className='font-mono text-sm'>{value.truncate()}</span>,
      width: 80,
      accessor: ({ topic }) => topic,
    },
    {
      Header: 'Active',
      Cell: ({ value }: any) => (value ? <Check className={mx('text-green-500', getSize(5))} /> : null),
      width: 80,
      accessor: ({ isActive }) => isActive,
    },
  ];

  return (
    <PanelContainer className='flex-row'>
      <div className='flex flex-col w-1/3 mt-2 overflow-auto border-r'>
        <Table compact columns={columns} data={items} />
      </div>
      {sessionId && (
        <div className='flex flex-1 flex-col w-2/3 overflow-auto'>
          <ConnectionInfoView
            connectionInfo={data
              ?.flatMap((swarm) => swarm.connections)
              .find((connection) => connection?.sessionId.equals(sessionId))}
          />
        </div>
      )}
    </PanelContainer>
  );
};

export default SwarmPanel;
