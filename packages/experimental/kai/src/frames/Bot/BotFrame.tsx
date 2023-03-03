//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';
import { Column } from 'react-table';

import { PublicKey } from '@dxos/keys';
import { Button, Table } from '@dxos/react-components';

import { useAppRouter } from '../../hooks';
import { BotClient } from './bot-client';

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

export const BotFrame = () => {
  const [status, setStatus] = useState('');
  const [records, setRecords] = useState<BotRecord[]>([]);
  const [botClient, setBotClient] = useState<BotClient>();
  const { space } = useAppRouter();

  useEffect(() => {
    if (!space) {
      return;
    }

    const botClient = new BotClient(space);
    setBotClient(botClient);

    return botClient.onStatusUpdate.on((status) => {
      setStatus(status);
      void refresh();
    });
  }, [space]);

  useEffect(() => {
    void refresh();
  }, [botClient]);

  const refreshTimeout = useRef<ReturnType<typeof setTimeout>>();
  const refresh = () => {
    clearTimeout(refreshTimeout.current);
    refreshTimeout.current = setTimeout(async () => {
      refreshTimeout.current = undefined;

      const response = (await botClient?.getBots()) ?? [];
      const records = response.map((record: any) => ({
        id: record.Id,
        name: record.Labels['dxos.bot.name'],
        created: new Date(record.Created * 1000).getTime(),
        state: record.State,
        status: record.Status
      }));

      setRecords(records);
    }, REFRESH_DELAY);
  };

  if (!botClient) {
    return null;
  }

  return (
    <div className='flex-1 flex-col px-2 overflow-hidden'>
      <div className='flex items-center p-2 mb-2'>
        <Button className='mr-2' onClick={refresh}>
          Refresh
        </Button>
        <Button className='mr-2' onClick={() => botClient.startBot('dxos.bot.test')}>
          Start Bot
        </Button>
        <div>{status}</div>
      </div>

      <Table
        columns={columns}
        data={records}
        slots={{
          header: { className: 'bg-paper-1-bg' },
          row: { className: 'hover:bg-selection-hover odd:bg-table-rowOdd even:bg-table-rowEven' }
        }}
      />
    </div>
  );
};
