//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { Column } from 'react-table';

import { PublicKey } from '@dxos/keys';
import { Button } from '@dxos/react-components';

import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';


const REFRESH_DELAY = 1000;

type BotRecord = {
  id: string;
  name: string;
  created: number;
  state: string;
  status: string;
};

const columns: Column<BotRecord>[] = [
  {
    Header: 'id',
    Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
    accessor: (record) => PublicKey.from(record.id).truncate(),
    width: 120
  },
  {
    Header: 'name',
    accessor: (record) => record.name,
    width: 120
  },
  {
    Header: 'created',
    accessor: (record) => new Date(record.created).toISOString(),
    width: 200
  },
  {
    Header: 'state',
    accessor: (record) => record.state,
    width: 120
  },
  {
    Header: 'status',
    accessor: (record) => record.status,
    width: 120
  }
];

export const NetworkFrame = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:7630/api/logs')
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'subscribe',
        filter: {
          context: {
            foo: 'bar'
          }
        }
      }))
    }
    socket.onmessage = msg => {
      setData(data => [...data, JSON.parse(msg.data)])
    }
  }, []);

  return (
    <div className='flex-1 flex-col px-2'>
      <div className='flex items-center p-2 mb-2'>
        <Button className='mr-2'>
          Button 1
        </Button>
        <Button className='mr-2'>
        Button 2
        </Button>
        <div></div>
      </div>
      <SyntaxHighlighter className='w-full' language='json' style={style}>
        {JSON.stringify(data, undefined, 2)}
      </SyntaxHighlighter>
    </div>
  );
};
