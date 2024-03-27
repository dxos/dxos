//
// Copyright 2023 DXOS.org
//

import { WifiHigh, WifiSlash } from '@phosphor-icons/react';
import React, { type FC, useEffect, useState } from 'react';

import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { type SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { PublicKey, useClient } from '@dxos/react-client';
import { useDevtools } from '@dxos/react-client/devtools';
import { useNetworkStatus } from '@dxos/react-client/mesh';
import { Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, type TableColumnDef } from '@dxos/react-ui-table';
import { getSize, mx } from '@dxos/react-ui-theme';

import { MasterDetailTable, Searchbar, Select } from '../../../components';

export type View<T> = {
  id: string;
  title: string;
  filter: (object: T) => boolean;
  subFilter?: (match?: string) => (object: T) => boolean;
  columns: TableColumnDef<T, any>[];
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
      helper.accessor('receivedAt', builder.date({ header: 'received' })),
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
        { id: 'peer', ...builder.key({ tooltip: true }) },
      ),
      // TODO(burdon): Time delta since last message?
      helper.accessor((response) => response.swarmEvent!.peerAvailable?.since ?? new Date(), {
        id: 'since',
        ...builder.date(),
      }),
      helper.accessor((response) => response.topic && PublicKey.from(response.topic), {
        id: 'topic',
        ...builder.key({ tooltip: true }),
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
      helper.accessor('receivedAt', builder.date({ header: 'received' })),
      helper.accessor((response) => PublicKey.from(response.message!.author), {
        id: 'author',
        ...builder.key({ tooltip: true }),
      }),
      helper.accessor((response) => PublicKey.from(response.message!.recipient), {
        id: 'recipient',
        ...builder.key({ tooltip: true }),
      }),
      helper.accessor((response) => response.message!.payload.messageId, { id: 'message' }),
      helper.accessor((response) => response.message!.payload?.payload?.topic, {
        id: 'topic',
        ...builder.key({ tooltip: true }),
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
      helper.accessor('receivedAt', builder.date({ header: 'received' })),
      helper.accessor((response) => PublicKey.from(response.message!.author), {
        id: 'author',
        ...builder.key({ tooltip: true }),
      }),
      helper.accessor((response) => PublicKey.from(response.message!.recipient), {
        id: 'recipient',
        ...builder.key({ tooltip: true }),
      }),
      helper.accessor((response) => response.message!.payload.messageId, {
        id: 'message',
        ...builder.key({ tooltip: true }),
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

export const SignalMessageTable = () => {
  const devtoolsHost = useDevtools();
  const [messages, setMessages] = useState<SignalResponse[]>([]);
  useEffect(() => {
    const signalOutput = devtoolsHost.subscribeToSignal();
    const signalResponses: SignalResponse[] = [];
    signalOutput.subscribe((response: SignalResponse) => {
      signalResponses.push(response);
      setMessages([...signalResponses]);
    });

    return () => {
      void signalOutput.close();
    };
  }, []);

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
        <Searchbar onChange={setSearch} />
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
