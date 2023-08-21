//
// Copyright 2021 DXOS.org
//

import { Check } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { getSize, mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { Table, TableColumn } from '@dxos/mosaic';
import { ConnectionInfo, SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { PanelContainer, ConnectionInfoView } from '../../components';
import { textLink } from '../../styles';

const SwarmPanel = () => {
  const devtoolsHost = useDevtools();
  const { data } = useStream(() => devtoolsHost.subscribeToSwarmInfo({}), {});
  const [sessionId, setSessionId] = useState<PublicKey | undefined>();

  type Connection = SwarmInfo & Partial<ConnectionInfo>;

  const items =
    data?.reduce<Connection[]>((connections, swarm) => {
      if (!swarm.connections?.length) {
        connections.push({ ...swarm });
      } else {
        for (const connection of swarm.connections ?? []) {
          connections.push({ ...swarm, ...connection });
        }
      }
      return connections;
    }, []) ?? [];

  // TODO(burdon): Add peers/connect/disconnect/error info.
  const columns: TableColumn<Connection>[] = [
    {
      Header: 'Active',
      Cell: ({ value }: any) => (value ? <Check className={mx('text-green-500', getSize(5))} /> : null),
      width: 40,
      accessor: 'isActive',
    },
    {
      Header: 'Swarm',
      Cell: ({ value }: any) => <span className='font-mono text-sm'>{value.truncate()}</span>,
      width: 80,
      accessor: 'id',
    },
    {
      Header: 'Topic',
      Cell: ({ value }: any) => <span className='font-mono text-sm'>{value.truncate()}</span>,
      width: 80,
      accessor: 'topic',
    },
    {
      Header: 'Connection',
      Cell: ({ value }: any) => <span className={'font-mono text-sm'}>{value}</span>,
      width: 80,
      accessor: 'state',
    },
    {
      Header: 'Session',
      Cell: ({ value }: any) => (
        <span className={mx('font-mono text-sm', textLink)} onClick={() => setSessionId(value)}>
          {value?.truncate()}
        </span>
      ),
      width: 80,
      accessor: 'sessionId',
    },
    {
      Header: 'Remote Peer',
      Cell: ({ value }: any) => <span className='font-mono text-sm'>{value?.truncate()}</span>,
      width: 80,
      accessor: 'remotePeerId',
    },
  ];

  return (
    <PanelContainer>
      <div className='h-1/2 overflow-auto'>
        <Table compact columns={columns} data={items} />
      </div>
      <div className='h-1/2 overflow-auto'>
        {sessionId && (
          <ConnectionInfoView
            connection={data
              ?.flatMap((swarm) => swarm.connections)
              .find((connection) => connection?.sessionId?.equals(sessionId))}
          />
        )}
      </div>
    </PanelContainer>
  );
};

export default SwarmPanel;
