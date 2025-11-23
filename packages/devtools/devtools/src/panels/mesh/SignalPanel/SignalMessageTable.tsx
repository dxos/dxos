//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect, useMemo, useState } from 'react';

import { Format } from '@dxos/echo';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { type SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { PublicKey, useClient } from '@dxos/react-client';
import { useDevtools } from '@dxos/react-client/devtools';
import { useNetworkStatus } from '@dxos/react-client/mesh';
import { Toolbar } from '@dxos/react-ui';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { MasterDetailTable, Searchbar, Select } from '../../../components';

export type View<T> = {
  id: string;
  title: string;
  filter: (object: T) => boolean;
  subFilter?: (match?: string) => (object: T) => boolean;
  properties: TablePropertyDefinition[];
  dataTransform: (response: T) => any;
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

    properties: [
      {
        name: 'receivedAt',
        format: Format.TypeFormat.TypeFormat.DateTime,
        title: 'received',
        sort: 'desc',
        size: 194,
      },
      {
        name: 'response',
        format: Format.TypeFormat.TypeFormat.SingleSelect,
        size: 100,
        config: {
          options: [
            { id: 'Available', title: 'Available', color: 'green' },
            { id: 'Left', title: 'Left', color: 'neutral' },
          ],
        },
      },
      { name: 'peer', format: Format.TypeFormat.DID },
      { name: 'since', format: Format.TypeFormat.TypeFormat.DateTime, size: 194 },
      { name: 'topic', format: Format.TypeFormat.DID },
    ],
    dataTransform: (response: SignalResponse) => ({
      id: `${response.receivedAt?.getTime()}-${Math.random()}`,
      receivedAt: response.receivedAt,
      response: response.swarmEvent?.peerAvailable ? 'Available' : response.swarmEvent?.peerLeft ? 'Left' : undefined,
      peer:
        (response.swarmEvent!.peerAvailable && PublicKey.from(response.swarmEvent!.peerAvailable.peer).toString()) ||
        (response.swarmEvent!.peerLeft && PublicKey.from(response.swarmEvent!.peerLeft.peer).toString()),
      since: response.swarmEvent!.peerAvailable?.since ?? new Date(),
      topic: response.topic && PublicKey.from(response.topic).toString(),
      _original: response,
    }),
  },
  {
    id: 'message',
    title: 'Message',
    filter: (response: SignalResponse) => {
      return !!response.message;
    },
    properties: [
      {
        name: 'receivedAt',
        format: Format.TypeFormat.TypeFormat.DateTime,
        title: 'received',
        size: 194,
      },
      { name: 'author', format: Format.TypeFormat.DID },
      { name: 'recipient', format: Format.TypeFormat.DID },
      { name: 'message', format: Format.TypeFormat.DID },
      { name: 'topic', format: Format.TypeFormat.DID },
    ],
    dataTransform: (response: SignalResponse) => ({
      id: `${response.receivedAt?.getTime()}-${Math.random()}`,
      receivedAt: response.receivedAt,
      author: PublicKey.from(response.message!.author).toString(),
      recipient: PublicKey.from(response.message!.recipient).toString(),
      message: response.message!.payload.messageId,
      topic: response.message!.payload?.payload?.topic,
      _original: response,
    }),
  },
  {
    id: 'ack',
    title: 'Acknowledgement',
    filter: (response: SignalResponse) => {
      return response.message?.payload['@type'] === 'dxos.mesh.messaging.Acknowledgement';
    },
    properties: [
      {
        name: 'receivedAt',
        format: Format.TypeFormat.TypeFormat.DateTime,
        title: 'received',
        size: 194,
      },
      { name: 'author', format: Format.TypeFormat.DID },
      { name: 'recipient', format: Format.TypeFormat.DID },
      { name: 'message', format: Format.TypeFormat.DID },
    ],
    dataTransform: (response: SignalResponse) => ({
      id: `${response.receivedAt?.getTime()}-${Math.random()}`,
      receivedAt: response.receivedAt,
      author: PublicKey.from(response.message!.author).toString(),
      recipient: PublicKey.from(response.message!.recipient).toString(),
      message: response.message!.payload.messageId,
      _original: response,
    }),
  },
];

export type ViewType = (typeof views)[number]['id'];
const getView = (id: ViewType): View<SignalResponse> => views.find((type) => type.id === id)!;

// TODO(burdon): Factor out.
const ToggleConnection: FC<{
  connection: ConnectionState;
  onToggleConnection: () => void;
}> = ({ connection, onToggleConnection }) => (
  <Toolbar.IconButton
    icon={connection === ConnectionState.ONLINE ? 'ph--wifi-high--regular' : 'ph--wifi-slash--regular'}
    iconOnly
    size={6}
    label='Toggle connection'
    classNames='mli-2 p-0 pli-2 items-center'
    onClick={onToggleConnection}
  />
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

  const tableData = useMemo(() => {
    if (!view) {
      return [];
    }
    return filteredMessages.map(view.dataTransform);
  }, [filteredMessages, view]);

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

      {view && (
        <MasterDetailTable properties={view.properties} data={tableData} detailsTransform={(d) => d._original} />
      )}
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
