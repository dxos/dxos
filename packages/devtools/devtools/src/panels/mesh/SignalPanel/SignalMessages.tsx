//
// Copyright 2023 DXOS.org
//

import { WifiHigh, WifiSlash } from '@phosphor-icons/react';
import React, { FC, useState } from 'react';

import { Toolbar } from '@dxos/aurora';
import { createDateColumn, createKeyColumn, createTextColumn, GridColumn } from '@dxos/aurora-grid';
import { getSize, mx } from '@dxos/aurora-theme';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { PublicKey, useClient } from '@dxos/react-client';
import { useNetworkStatus } from '@dxos/react-client/mesh';
import { humanize } from '@dxos/util';

import { MasterDetailTable, Searchbar, Select } from '../../../components';

export type View<T> = {
  id: string;
  title: string;
  filter: (object: T) => boolean;
  subFilter?: (match?: string) => (object: T) => boolean;
  columns: GridColumn<T>[];
};

const views: View<SignalResponse>[] = [
  {
    id: 'swarm-event',
    title: 'SwarmEvent',
    filter: (response: SignalResponse) => {
      return !!response.swarmEvent;
    },

    // TODO(burdon): Fixed width for date.
    // TODO(burdon): Add id property (can't use date?) Same for swarm panel.

    columns: [
      createDateColumn('received', undefined, { accessor: 'receivedAt', key: true }), // MM/dd HH:mm:ss
      createTextColumn('type', {
        accessor: (response) => {
          if (response.swarmEvent?.peerAvailable) {
            return 'Available';
          } else if (response.swarmEvent?.peerLeft) {
            return 'Left';
          }
        },
        width: 80,
      }),
      createKeyColumn('peer', {
        accessor: (response) =>
          (response.swarmEvent!.peerAvailable && PublicKey.from(response.swarmEvent!.peerAvailable.peer)) ||
          (response.swarmEvent!.peerLeft && PublicKey.from(response.swarmEvent!.peerLeft.peer)),
      }),
      // TODO(burdon): Time delta since last message?
      createDateColumn('since', undefined, {
        accessor: (response) => response.swarmEvent!.peerAvailable?.since,
      }),
    ],
  },
  {
    id: 'message',
    title: 'Message',
    filter: (response: SignalResponse) => {
      return !!response.message;
    },
    columns: [
      createDateColumn('received', undefined, { accessor: 'receivedAt', key: true }),
      createKeyColumn('author', { accessor: 'message.author' }),
      createKeyColumn('recipient', { accessor: 'message.recipient' }),
      createKeyColumn('message', { accessor: (response) => response.message?.payload.messageId }),
      createKeyColumn('topic', {
        accessor: (response) =>
          response.message!.payload?.payload?.topic && humanize(response.message!.payload?.payload?.topic),
      }),
    ] as GridColumn<SignalResponse>[],
  },
  {
    id: 'ack',
    title: 'Acknowledgement',
    filter: (response: SignalResponse) => {
      return response.message?.payload['@type'] === 'dxos.mesh.messaging.Acknowledgement';
    },
    columns: [
      createDateColumn('received', undefined, { accessor: 'receivedAt', key: true }),
      createKeyColumn('author', { accessor: 'message.author' }),
      createKeyColumn('recipient', { accessor: 'message.recipient' }),
      createKeyColumn('message', { accessor: (response) => response.message?.payload.messageId }),
    ],
  },
];

export type ViewType = (typeof views)[number]['id'];
const getView = (id: ViewType): View<SignalResponse> => views.find((type) => type.id === id)!;

// TODO(burdon): Factor out.
const ToggleConnection: FC<{ connection: ConnectionState; onToggleConnection: () => void }> = ({
  connection,
  onToggleConnection,
}) => (
  <Toolbar.Button
    title='Toggle connection state.'
    classNames='mli-2 p-0 px-2 items-center'
    onClick={onToggleConnection}
  >
    {connection === ConnectionState.ONLINE ? (
      <WifiHigh className={getSize(6)} />
    ) : (
      <WifiSlash className={mx(getSize(6), 'text-selection-text')} />
    )}
    <span className='pl-2 whitespace-nowrap'>Toggle connection</span>
  </Toolbar.Button>
);

export type SignalMessagesProps = {
  messages?: SignalResponse[];
};

export const SignalMessages = (props: SignalMessagesProps) => {
  const { messages } = { messages: [], ...props };
  const [viewType, setViewType] = useState<ViewType>('swarm-event');
  const [search, setSearch] = useState('');
  const view = viewType ? getView(viewType) : undefined;
  const filteredMessages = getFilteredData(messages, view, search);

  // TODO(burdon): Use services directly?
  const client = useClient();
  const { swarm: connectionState } = useNetworkStatus();
  const handleToggleConnection = async () => {
    switch (connectionState) {
      case ConnectionState.OFFLINE: {
        await client.mesh.updateConfig(ConnectionState.ONLINE);
        break;
      }

      case ConnectionState.ONLINE: {
        await client.mesh.updateConfig(ConnectionState.OFFLINE);
        break;
      }
    }
  };

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <Toolbar.Root>
        <Select
          items={views.map(({ id, title }) => ({ value: id, label: title }))}
          value={viewType}
          onValueChange={(type) => setViewType(type as ViewType)}
        />
        <Searchbar onSearch={setSearch} />
        <ToggleConnection connection={connectionState} onToggleConnection={handleToggleConnection} />
      </Toolbar.Root>

      <div className='flex grow overflow-hidden'>
        {view && <MasterDetailTable<SignalResponse> columns={view.columns} data={filteredMessages} />}
      </div>
    </div>
  );
};

const getFilteredData = (messages: SignalResponse[], view?: View<SignalResponse>, searchText?: string) => {
  const defaultSubFilter = (match?: string) => (object: SignalResponse) => {
    if (!match) {
      return true;
    }

    return JSON.stringify(object).includes(match);
  };

  return view
    ? messages.filter(view.filter).filter(view.subFilter ? view.subFilter(searchText) : defaultSubFilter(searchText))
    : messages;
};
