//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { Column } from 'react-table';

import { Searchbar, Selector, SelectorOption, Table } from '@dxos/kai';
import { SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools } from '@dxos/react-client';
import { humanize } from '@dxos/util';

type ColumnType<T> = SelectorOption & {
  filter: (object: T) => boolean;
  subFilter: (match?: string) => (object: T) => boolean;
  columns: Column<{}>[];
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
        Header: 'Timestamp',
        accessor: (response: SignalResponse) => response.swarmEvent!.peerAvailable?.since?.toString()
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
        Header: 'Author',
        accessor: (response: SignalResponse) => humanize(response.message!.author)
      },
      {
        Header: 'Recipient',
        accessor: (response: SignalResponse) => humanize(response.message!.recipient)
      },
      { Header: 'Payload', accessor: (response: SignalResponse) => JSON.stringify(response.message?.payload) },
      {
        Header: 'Topic',
        accessor: (response: SignalResponse) => humanize(response.message!.payload.topic)
      }
    ]
  }
];

const getType = (id: string): ColumnType<any> => types.find((type) => type.id === id)!;

export const SignalMessages = () => {
  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }

  const [type, setType] = useState<ColumnType<SignalResponse>>(types[0]);

  const [text, setText] = useState<string>();
  const handleSearch = (text: string) => {
    setText(text);
  };

  const handleSelect = (id?: string) => {
    if (id) {
      setType(getType(id));
    }
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

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='flex p-3 border-b border-slate-200 border-solid'>
        <div className='flex'>
          <div className='mr-2'>
            <Selector options={types} value={type.id} onSelect={handleSelect} />
          </div>
          <div>
            <Searchbar onSearch={handleSearch} />
          </div>
        </div>
      </div>
      {/* <div className='flex flex-1 overflow-hidden'> */}
      <Table
        columns={type.columns as any}
        data={signalResponses.filter(type.filter).filter(type.subFilter(text)) as any}
      />
      {/* </div> */}
    </div>
  );
};
