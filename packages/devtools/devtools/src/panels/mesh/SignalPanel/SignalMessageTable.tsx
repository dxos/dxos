//
// Copyright 2023 DXOS.org
//

import { fromBinary } from '@bufbuild/protobuf';
import { timestampDate } from '@bufbuild/protobuf/wkt';
import React, { type FC, useEffect, useMemo, useState } from 'react';

import { Format } from '@dxos/echo/Format';
import { toPublicKey } from '@dxos/protocols/buf';
import { bufRegistry } from '@dxos/protocols/buf-registry';
import { ConnectionState } from '@dxos/protocols/buf/dxos/client/services_pb';
import { type SignalResponse } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { AcknowledgementSchema, ReliablePayloadSchema } from '@dxos/protocols/buf/dxos/mesh/messaging_pb';
import { type Message as SignalMessage, type SwarmEvent } from '@dxos/protocols/buf/dxos/mesh/signal_pb';
import { PublicKey, useClient } from '@dxos/react-client';
import { useDevtools } from '@dxos/react-client/devtools';
import { useNetworkStatus } from '@dxos/react-client/mesh';
import { Toolbar } from '@dxos/react-ui';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { MasterDetailTable, Searchbar, Select } from '../../../components';

const ACKNOWLEDGEMENT = 'dxos.mesh.messaging.Acknowledgement';
const RELIABLE_PAYLOAD = 'dxos.mesh.messaging.ReliablePayload';

const swarmEventOf = (response: SignalResponse): SwarmEvent | undefined =>
  response.data.case === 'swarmEvent' ? response.data.value : undefined;

const messageOf = (response: SignalResponse): SignalMessage | undefined =>
  response.data.case === 'message' ? response.data.value : undefined;

const receivedAtOf = (response: SignalResponse): Date | undefined =>
  response.receivedAt && timestampDate(response.receivedAt);

/** Reads the message id out of the still-packed payload; the envelope only carries bytes. */
const messageIdOf = (message: SignalMessage | undefined): string | undefined => {
  switch (message?.payload?.typeUrl) {
    case RELIABLE_PAYLOAD:
      return toPublicKey(fromBinary(ReliablePayloadSchema, message.payload.value).messageId)?.toString();
    case ACKNOWLEDGEMENT:
      return toPublicKey(fromBinary(AcknowledgementSchema, message.payload.value).messageId)?.toString();
    default:
      return undefined;
  }
};

/**
 * Reads `topic` off the payload nested inside a `ReliablePayload`.
 *
 * Display only, and resolved against the registry rather than assumed: the inner payload is an
 * `Any` whose type varies by sender, and nothing here re-encodes what it decodes.
 */
const topicOf = (message: SignalMessage | undefined): unknown => {
  if (message?.payload?.typeUrl !== RELIABLE_PAYLOAD) {
    return undefined;
  }
  const inner = fromBinary(ReliablePayloadSchema, message.payload.value).payload;
  const desc = inner && bufRegistry.getMessage(inner.typeUrl);
  if (!desc || !inner) {
    return undefined;
  }
  const decoded: Record<string, unknown> = fromBinary(desc, inner.value);
  return decoded.topic;
};

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
    filter: (response: SignalResponse) => swarmEventOf(response)?.event.case !== undefined,

    // TODO(burdon): Fixed width for date.
    // TODO(burdon): Add id property (can't use date?) Same for swarm panel.

    properties: [
      {
        name: 'receivedAt',
        format: Format.TypeFormat.DateTime,
        title: 'received',
        sort: 'desc',
        size: 194,
      },
      {
        name: 'response',
        format: Format.TypeFormat.SingleSelect,
        size: 100,
        config: {
          options: [
            { id: 'Available', title: 'Available', color: 'green' },
            { id: 'Left', title: 'Left', color: 'neutral' },
          ],
        },
      },
      { name: 'peer', format: Format.TypeFormat.DID },
      { name: 'since', format: Format.TypeFormat.DateTime, size: 194 },
      { name: 'topic', format: Format.TypeFormat.DID },
    ],
    dataTransform: (response: SignalResponse) => {
      const event = swarmEventOf(response)?.event;
      const receivedAt = receivedAtOf(response);
      return {
        id: `${receivedAt?.getTime()}-${Math.random()}`,
        receivedAt,
        response: event?.case === 'peerAvailable' ? 'Available' : event?.case === 'peerLeft' ? 'Left' : undefined,
        peer: event?.value && PublicKey.from(event.value.peer).toString(),
        since: (event?.case === 'peerAvailable' && event.value.since && timestampDate(event.value.since)) || new Date(),
        topic: response.topic && PublicKey.from(response.topic).toString(),
        _original: response,
      };
    },
  },
  {
    id: 'message',
    title: 'Message',
    filter: (response: SignalResponse) => messageOf(response) !== undefined,
    properties: [
      {
        name: 'receivedAt',
        format: Format.TypeFormat.DateTime,
        title: 'received',
        size: 194,
      },
      { name: 'author', format: Format.TypeFormat.DID },
      { name: 'recipient', format: Format.TypeFormat.DID },
      { name: 'message', format: Format.TypeFormat.DID },
      { name: 'topic', format: Format.TypeFormat.DID },
    ],
    dataTransform: (response: SignalResponse) => {
      const message = messageOf(response);
      const receivedAt = receivedAtOf(response);
      return {
        id: `${receivedAt?.getTime()}-${Math.random()}`,
        receivedAt,
        author: message && PublicKey.from(message.author).toString(),
        recipient: message && PublicKey.from(message.recipient).toString(),
        message: messageIdOf(message),
        topic: topicOf(message),
        _original: response,
      };
    },
  },
  {
    id: 'ack',
    title: 'Acknowledgement',
    // The payload stays packed, so the discriminator is its `type_url` rather than a decoded tag.
    filter: (response: SignalResponse) => messageOf(response)?.payload?.typeUrl === ACKNOWLEDGEMENT,
    properties: [
      {
        name: 'receivedAt',
        format: Format.TypeFormat.DateTime,
        title: 'received',
        size: 194,
      },
      { name: 'author', format: Format.TypeFormat.DID },
      { name: 'recipient', format: Format.TypeFormat.DID },
      { name: 'message', format: Format.TypeFormat.DID },
    ],
    dataTransform: (response: SignalResponse) => {
      const message = messageOf(response);
      const receivedAt = receivedAtOf(response);
      return {
        id: `${receivedAt?.getTime()}-${Math.random()}`,
        receivedAt,
        author: message && PublicKey.from(message.author).toString(),
        recipient: message && PublicKey.from(message.recipient).toString(),
        message: messageIdOf(message),
        _original: response,
      };
    },
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
    classNames='mx-2 p-0 px-2 items-center'
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
