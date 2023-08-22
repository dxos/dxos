//
// Copyright 2023 DXOS.org
//

import { WifiHigh, WifiSlash } from '@phosphor-icons/react';
import React, { FC, useState } from 'react';

import { Toolbar } from '@dxos/aurora';
import { createColumnBuilder, GridColumnDef } from '@dxos/aurora-grid';
import { getSize, mx } from '@dxos/aurora-theme';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { PublicKey, useClient } from '@dxos/react-client';
import { useNetworkStatus } from '@dxos/react-client/mesh';

import { MasterDetailTable, Searchbar, Select } from '../../../components';

export type View<T> = {
  id: string;
  title: string;
  filter: (object: T) => boolean;
  subFilter?: (match?: string) => (object: T) => boolean;
  columns: GridColumnDef<T, any>[];
};

const { helper, builder } = createColumnBuilder<SignalResponse>();
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
      helper.accessor('receivedAt', builder.createDate({ header: 'received' })),
      helper.accessor(
        (response) => {
          if (response.swarmEvent?.peerAvailable) {
            return 'Available';
          } else if (response.swarmEvent?.peerLeft) {
            return 'Left';
          }
        },
        { id: 'response', size: 80 },
      ),
      helper.accessor(
        (response) =>
          (response.swarmEvent!.peerAvailable && PublicKey.from(response.swarmEvent!.peerAvailable.peer)) ||
          (response.swarmEvent!.peerLeft && PublicKey.from(response.swarmEvent!.peerLeft.peer)),
        { id: 'peer', ...builder.createKey({ tooltip: true }) },
      ),
      // TODO(burdon): Time delta since last message?
      helper.accessor((response) => response.swarmEvent!.peerAvailable?.since, {
        id: 'since',
        ...builder.createDate(),
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
      helper.accessor('receivedAt', builder.createDate({ header: 'received' })),
      helper.accessor((response) => response.message!.author as unknown as PublicKey, {
        id: 'author',
        ...builder.createKey({ tooltip: true }),
      }),
      helper.accessor((response) => response.message!.recipient as unknown as PublicKey, {
        id: 'recipient',
        ...builder.createKey({ tooltip: true }),
      }),
      helper.accessor((response) => response.message!.payload.messageId, { id: 'message' }),
      helper.accessor((response) => response.message!.payload?.payload?.topic, {
        id: 'topic',
        ...builder.createKey({ tooltip: true }),
      }),
    ],
  },
  {
    id: 'ack',
    title: 'Acknowledgement',
    filter: (response: SignalResponse) => {
      return response.message?.payload['@type'] === 'dxos.mesh.messaging.Acknowledgement';
    },
    columns: [
      helper.accessor('receivedAt', builder.createDate({ header: 'received' })),
      helper.accessor((response) => response.message!.author as unknown as PublicKey, {
        id: 'author',
        ...builder.createKey({ tooltip: true }),
      }),
      helper.accessor((response) => response.message!.recipient as unknown as PublicKey, {
        id: 'recipient',
        ...builder.createKey({ tooltip: true }),
      }),
      helper.accessor((response) => response.message!.payload.messageId, {
        id: 'message',
        ...builder.createKey({ tooltip: true }),
      }),
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
