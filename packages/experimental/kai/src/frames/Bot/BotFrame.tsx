//
// Copyright 2023 DXOS.org
//

import formatDistance from 'date-fns/formatDistance';
import React, { useEffect, useRef, useState } from 'react';
import { Column } from 'react-table';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { Button, Select, Table } from '@dxos/react-components';

import { botDefs, useAppRouter, useBotClient } from '../../hooks';

const REFRESH_DELAY = 1000;

type BotRecord = {
  id: string;
  image: string;
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
    Header: 'image',
    Cell: ({ value }: any) => <div className='font-mono'>{truncateKey(value, 4)}</div>,
    accessor: (record) => record.image.split(':')[1],
    width: 120
  },
  {
    Header: 'name',
    accessor: (record) => record.name,
    width: 160
  },
  {
    Header: 'created',
    accessor: (record) => formatDistance(new Date(record.created), Date.now(), { addSuffix: true }),
    width: 160
  },
  {
    Header: 'state',
    accessor: (record) => record.state,
    width: 100
  },
  {
    Header: 'status',
    accessor: (record) => record.status,
    width: 160
  }
];

export const BotFrame = () => {
  const [status, setStatus] = useState('');
  const [records, setRecords] = useState<BotRecord[]>([]);
  const [botId, setBotId] = useState<string>(botDefs[0].module.id!);
  const { space } = useAppRouter();
  const botClient = useBotClient(space!);

  useEffect(() => {
    void refresh();
    return botClient.onStatusUpdate.on((status) => {
      setStatus(status);
      void refresh();
    });
  }, [botClient]);

  // TODO(burdon): Error handling.
  // TODO(burdon): Show status in a pending table row.
  const refreshTimeout = useRef<ReturnType<typeof setTimeout>>();
  const refresh = () => {
    clearTimeout(refreshTimeout.current);
    refreshTimeout.current = setTimeout(async () => {
      refreshTimeout.current = undefined;

      const response = (await botClient?.getBots()) ?? [];
      const records = response.map((record: any) => ({
        id: record.Id,
        image: record.ImageID,
        name: record.Labels['dxos.bot.name'],
        created: new Date(record.Created * 1000).getTime(),
        state: record.State,
        status: record.Status
      }));

      setRecords(records);
      setStatus('');
    }, REFRESH_DELAY);
  };

  if (!botClient) {
    return null;
  }

  return (
    <div className='flex-1 flex-col px-2 overflow-hidden'>
      <div className='flex items-center p-2 mb-2'>
        <Button className='mr-2' onClick={() => botId && botClient.startBot(botId)}>
          Start
        </Button>
        {/* TODO(burdon): full width, value, onChange. */}
        <Select defaultValue={botId} onValueChange={setBotId}>
          {botDefs.map(({ module: { id, displayName } }) => (
            <Select.Item key={id} value={id!}>
              {displayName}
            </Select.Item>
          ))}
        </Select>
        <div className='grow' />
        <Button variant='ghost' className='mr-2' onClick={refresh}>
          Refresh
        </Button>
      </div>

      <Table
        columns={columns}
        data={records}
        slots={{
          header: { className: 'bg-paper-1-bg' },
          row: { className: 'hover:bg-hover-bg odd:bg-table-rowOdd even:bg-table-rowEven' }
        }}
      />

      <div className='mt-2 p-2'>{status}</div>
    </div>
  );
};
