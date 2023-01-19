//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { Column } from 'react-table';

import { Searchbar, Selector, SelectorOption, Table } from '@dxos/kai';
import { SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components-deprecated';
import { humanize } from '@dxos/util';

type ColumnType<T extends {}> = SelectorOption & {
  filter: (object: T) => boolean;
  subFilter: (match?: string) => (object: T) => boolean;
  columns: Column<T>[];
};

const matchJsonString =
  (match = '') =>
  (event: SignalResponse) => {
    return JSON.stringify(event).includes(match);
  };

const types: ColumnType<SignalResponse>[] = [
  {
    id: 'swarm-event',
    title: 'SwarmEvent',
    filter: (response: SignalResponse) => {
      return !!response.swarmEvent;
    },
    subFilter: matchJsonString,
    columns: [
      {
        Header: 'Received At',
        accessor: (response: SignalResponse) => response.receivedAt.toJSON()
      },
      {
        Header: 'TYPE',
        accessor: (response: SignalResponse) => {
          if (response.swarmEvent?.peerAvailable) {
            return 'PeerAvailable';
          } else if (response.swarmEvent?.peerLeft) {
            return 'PeerLeft';
          }
        }
      },
      {
        Header: 'Peer',
        accessor: (response: SignalResponse) =>
          humanize(response.swarmEvent!.peerAvailable?.peer ?? '') ||
          humanize(response.swarmEvent!.peerLeft?.peer ?? '')
      },
      {
        Header: 'Since',
        accessor: (response: SignalResponse) => response.swarmEvent!.peerAvailable?.since?.toJSON()
      }
    ]
  },
  {
    id: 'message',
    title: 'Message',
    filter: (response: SignalResponse) => {
      return !!response.message;
    },
    subFilter: matchJsonString,
    columns: [
      {
        Header: 'Received At',
        accessor: (response: SignalResponse) => response.receivedAt.toJSON()
      },
      {
        Header: 'Author',
        accessor: (response: SignalResponse) => humanize(response.message!.author)
      },
      {
        Header: 'Recipient',
        accessor: (response: SignalResponse) => humanize(response.message!.recipient)
      },
      { Header: 'Payload', accessor: (response: SignalResponse) => JSON.stringify(response.message?.payload) },
      { Header: 'MessageID', accessor: (response: SignalResponse) => humanize(response.message?.payload.messageId) },
      {
        Header: 'Topic',
        accessor: (response: SignalResponse) =>
          response.message!.payload?.payload?.topic && humanize(response.message!.payload?.payload?.topic)
      }
    ]
  },
  {
    id: 'ack',
    title: 'Acknologment',
    filter: (response: SignalResponse) => {
      return response.message?.payload['@type'] === 'dxos.mesh.messaging.Acknowledgement';
    },
    subFilter: matchJsonString,
    columns: [
      {
        Header: 'Received At',
        accessor: (response: SignalResponse) => response.receivedAt.toJSON()
      },
      {
        Header: 'Author',
        accessor: (response: SignalResponse) => humanize(response.message!.author)
      },
      {
        Header: 'Recipient',
        accessor: (response: SignalResponse) => humanize(response.message!.recipient)
      },
      { Header: 'MessageID', accessor: (response: SignalResponse) => humanize(response.message?.payload.messageId) }
    ]
  }
];

const getType = (id: string): ColumnType<SignalResponse> => types.find((type) => type.id === id)!;

export const SignalMessages = () => {
  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }

  const [text, setText] = useState<string>('');
  const handleSearch = (text: string) => {
    setText(text);
  };

  const [type, setType] = useState<ColumnType<SignalResponse>>(types[0]);
  const selectType = (id?: string) => {
    if (id) {
      setType(getType(id));
      setSelected(0);
    }
  };

  const [selected, setSelected] = useState<number>(0);
  const selectRow = (index: number) => {
    setSelected(index);
  };

  const [signalResponses, setSignalResponses] = useState<SignalResponse[]>([]);

  useEffect(() => {
    const signalOutput = devtoolsHost.subscribeToSignal();
    const signalResponses: SignalResponse[] = [];
    signalOutput.subscribe((response: SignalResponse) => {
      signalResponses.push(response);
      setSignalResponses([...signalResponses]);
    });

    return () => {
      signalOutput.close();
    };
  }, []);

  const getFilteredData = () => signalResponses.filter(type.filter).filter(type.subFilter(text));

  return (
    <div className='flex flex-col flex-1'>
      <div className='flex p-3 border-b border-slate-200 border-solid'>
        <div className='flex'>
          <div className='mr-2'>
            <Selector options={types} value={type.id} onSelect={selectType} />
          </div>
          <div>
            <Searchbar onSearch={handleSearch} />
          </div>
        </div>
      </div>
      <div className='flex flex-row'>
        <div className='flex w-1/2 h-full'>
          <Table
            columns={type.columns as any}
            data={getFilteredData() as any}
            selected={selected}
            onSelect={selectRow}
          />
        </div>
        <div className='flex w-1/2'>
          <JsonTreeView data={getFilteredData().at(selected)} />
        </div>
      </div>
    </div>
  );
};
