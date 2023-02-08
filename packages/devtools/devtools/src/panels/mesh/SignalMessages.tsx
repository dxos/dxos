//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { Column } from 'react-table';

import { SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools } from '@dxos/react-client';
import { Searchbar, Selector, SelectorOption } from '@dxos/react-components';
import { humanize } from '@dxos/util';

import { MasterTable } from '../../components';

type ColumnType<T extends {}> = SelectorOption & {
  filter: (object: T) => boolean;
  subFilter?: (match?: string) => (object: T) => boolean;
  columns: Column<T>[];
};

const types: ColumnType<SignalResponse>[] = [
  {
    id: 'swarm-event',
    title: 'SwarmEvent',
    filter: (response: SignalResponse) => {
      return !!response.swarmEvent;
    },
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
          (response.swarmEvent!.peerAvailable && humanize(response.swarmEvent!.peerAvailable.peer)) ||
          (response.swarmEvent!.peerLeft && humanize(response.swarmEvent!.peerLeft.peer))
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
      {
        Header: 'MessageID',
        accessor: (response: SignalResponse) => humanize(response.message!.payload.messageId)
      }
    ]
  }
];

const getType = (id: string): ColumnType<SignalResponse> => types.find((type) => type.id === id)!;

const SignalMessages = () => {
  const devtoolsHost = useDevtools();
  const [signalResponses, setSignalResponses] = useState<SignalResponse[]>([]);

  const [type, setType] = useState<ColumnType<SignalResponse>>(getType('swarm-event'));
  const handleSearch = (text: string) => {
    setText(text);
  };

  const [text, setText] = useState<string>();
  const handleSelect = (id?: string) => {
    if (id) {
      setType(getType(id));
    }
  };

  const defaultSubFilter = (match?: string) => (object: SignalResponse) => {
    if (!match) {
      return true;
    }
    return JSON.stringify(object).includes(match);
  };

  const getFilteredData = () => {
    return signalResponses.filter(type.filter).filter(type.subFilter ? type.subFilter(text) : defaultSubFilter(text));
  };

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
      <div className='flex flex-1 overflow-hidden'>
        <MasterTable columns={type.columns} data={getFilteredData()} />
      </div>
    </div>
  );
};

export default SignalMessages;
