//
// Copyright 2023 DXOS.org
//

import { format } from 'date-fns';
import React, { useState } from 'react';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { TableColumn } from '@dxos/mosaic';
import { SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { Searchbar, Select } from '@dxos/react-appkit';
import { humanize } from '@dxos/util';

import { MasterDetailTable, Toolbar } from '../../components';

export type View<T extends {}> = {
  id: string;
  title: string;
  filter: (object: T) => boolean;
  subFilter?: (match?: string) => (object: T) => boolean;
  columns: readonly TableColumn<T>[];
};

const views = [
  {
    id: 'swarm-event',
    title: 'SwarmEvent',
    filter: (response: SignalResponse) => {
      return !!response.swarmEvent;
    },
    columns: [
      {
        Header: 'Received At',
        width: 100,
        accessor: (response: SignalResponse) => format(response.receivedAt, 'MM/dd HH:mm:ss'),
      },
      {
        Header: 'TYPE',
        width: 100,
        accessor: (response: SignalResponse) => {
          if (response.swarmEvent?.peerAvailable) {
            return 'Available';
          } else if (response.swarmEvent?.peerLeft) {
            return 'Left';
          }
        },
      },
      {
        Header: 'Peer Key',
        width: 100,
        Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
        accessor: (response: SignalResponse) =>
          (response.swarmEvent!.peerAvailable && PublicKey.from(response.swarmEvent!.peerAvailable.peer).truncate()) ||
          (response.swarmEvent!.peerLeft && truncateKey(response.swarmEvent!.peerLeft.peer)),
      },
      {
        Header: 'Peer Name',
        width: 180,
        accessor: (response: SignalResponse) =>
          (response.swarmEvent!.peerAvailable && humanize(response.swarmEvent!.peerAvailable.peer)) ||
          (response.swarmEvent!.peerLeft && humanize(response.swarmEvent!.peerLeft.peer)),
      },
      // TODO(burdon): Time delta since last message?
      {
        Header: 'Since',
        width: 100,
        accessor: (response: SignalResponse) =>
          response.swarmEvent!.peerAvailable?.since
            ? format(response.swarmEvent!.peerAvailable?.since, 'MM/dd HH:mm:ss')
            : '',
      },
    ],
  },
  {
    id: 'message',
    title: 'Message',
    filter: (response: SignalResponse) => {
      return !!response.message;
    },
    columns: [
      {
        Header: 'Received At',
        accessor: (response: SignalResponse) => response.receivedAt.toJSON(),
      },
      {
        Header: 'Author',
        accessor: (response: SignalResponse) => humanize(response.message!.author),
      },
      {
        Header: 'Recipient',
        accessor: (response: SignalResponse) => humanize(response.message!.recipient),
      },
      { Header: 'MessageID', accessor: (response: SignalResponse) => humanize(response.message?.payload.messageId) },
      {
        Header: 'Topic',
        accessor: (response: SignalResponse) =>
          response.message!.payload?.payload?.topic && humanize(response.message!.payload?.payload?.topic),
      },
    ],
  },
  {
    id: 'ack',
    title: 'Acknologment',
    filter: (response: SignalResponse) => {
      return response.message?.payload['@type'] === 'dxos.mesh.messaging.Acknowledgement';
    },
    columns: [
      {
        Header: 'Received At',
        accessor: (response: SignalResponse) => response.receivedAt.toJSON(),
      },
      {
        Header: 'Author',
        accessor: (response: SignalResponse) => humanize(response.message!.author),
      },
      {
        Header: 'Recipient',
        accessor: (response: SignalResponse) => humanize(response.message!.recipient),
      },
      {
        Header: 'MessageID',
        accessor: (response: SignalResponse) => humanize(response.message!.payload.messageId),
      },
    ],
  },
] as const; // This is ok because getView below will fail typecheck if this array is misdefined.

export type ViewType = (typeof views)[number]['id'];

const getView = (id: ViewType): View<SignalResponse> => views.find((type) => type.id === id)!;

export type SignalMessagesProps = {
  messages?: SignalResponse[];
};

export const SignalMessages = (props: SignalMessagesProps) => {
  const { messages } = { messages: [], ...props };
  const [viewType, setViewType] = useState<ViewType>('swarm-event');
  const [search, setSearch] = useState('');
  const view = viewType ? getView(viewType) : undefined;
  const filteredMessages = getFilteredData(messages, view, search);

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <Toolbar>
        <Select className='mr-2' defaultValue={viewType} onValueChange={(s) => setViewType(s as ViewType)}>
          {views.map(({ id, title }) => (
            <Select.Item value={id} key={id}>
              {title}
            </Select.Item>
          ))}
        </Select>
        <Searchbar onSearch={setSearch} />
      </Toolbar>

      <div className='flex flex-1 overflow-hidden'>
        {view ? <MasterDetailTable columns={view.columns as any} data={filteredMessages} /> : null}
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
