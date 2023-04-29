//
// Copyright 2023 DXOS.org
//

import { Robot, Ghost, X } from '@phosphor-icons/react';
import formatDistance from 'date-fns/formatDistance';
import React, { useCallback, useEffect, useState } from 'react';

import { debounce } from '@dxos/async';
import { Button } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { TableCellProps, TableColumn, Table, Toolbar } from '@dxos/mosaic';
import { Select } from '@dxos/react-appkit';
import { useKeyStore } from '@dxos/react-client';

import { botDefs, useAppRouter, useBotClient, getBotEnvs, botKeys } from '../../hooks';

const REFRESH_DELAY = 5_000;

type BotRecord = {
  id: string;
  image: string;
  name: string;
  port: number;
  created: number;
  state: string;
};

// running | exited
const columns = ({ onStop }: { onStop: (id: string) => void }): TableColumn<BotRecord>[] => [
  {
    Header: 'state',
    Cell: ({ value }: any) =>
      value === 'running' ? (
        <Robot className={mx(getSize(6), 'text-green-500')} />
      ) : (
        <Ghost className={mx(getSize(6), 'text-gray-400')} />
      ),
    accessor: (record) => record.state,
    width: 48
  },
  {
    Header: 'name',
    accessor: (record) => record.name,
    width: 200
  },
  {
    Header: 'port',
    Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
    accessor: (record) => record.port,
    width: 80
  },
  {
    Header: 'container',
    Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
    accessor: (record) => PublicKey.from(record.id).toHex().slice(0, 12),
    width: 120
  },
  {
    Header: 'image',
    Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
    accessor: (record) => PublicKey.from(record.image.split(':')[1]).toHex().slice(0, 12),
    width: 120
  },
  {
    Header: 'created',
    accessor: (record) => formatDistance(new Date(record.created), Date.now(), { addSuffix: true }),
    width: 160
  },
  {
    id: '__delete',
    width: 80,
    Cell: ({ cell }: TableCellProps<BotRecord>) => {
      return (
        <Button variant='ghost' onClick={() => onStop(cell.row.original.id)}>
          <X />
        </Button>
      );
    }
  }
];

export const BotManager = () => {
  const [status, setStatus] = useState<string>();
  const [records, setRecords] = useState<BotRecord[]>([]);
  const [botId, setBotId] = useState<string>(botDefs[0].module.id!);
  const { space } = useAppRouter();
  const botClient = useBotClient(space!);
  const [keyMap] = useKeyStore(Object.keys(botKeys));

  useEffect(() => {
    void refresh();
    const interval = setInterval(refresh, REFRESH_DELAY);
    const unsubscribe = botClient.onStatusUpdate.on((status) => {
      setStatus(status);
      void refresh();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [botClient]);

  // TODO(burdon): Error handling.
  // TODO(burdon): Show status in a pending table row.
  const refresh = useCallback(
    debounce(async () => {
      if (!botClient.active) {
        return;
      }

      const response = await botClient?.getBots();
      const records = response.map((record: any) => ({
        id: record.Id,
        image: record.ImageID,
        name: record.Labels['dxos.bot.name'],
        port: record.Ports[0]?.PublicPort,
        created: new Date(record.Created * 1000).getTime(),
        state: record.State
      }));

      setRecords(records);
      setStatus('');
    }),
    [botClient]
  );

  const handleFlush = async () => {
    setStatus('flushing...');
    await botClient?.flushBots();
    setStatus('');
    refresh();
  };

  const handleStop = async (id: string) => {
    setStatus('stopping...');
    await botClient?.stopBot(id);
    setTimeout(handleFlush, 10_000);
  };

  const handleStopAll = async () => {
    setStatus('stopping...');
    await botClient?.stopBots();
    setTimeout(handleFlush, 10_000);
  };

  if (!botClient) {
    return null;
  }

  return (
    <div className='flex flex-1 flex-col px-2 overflow-hidden'>
      <Toolbar className='justify-between'>
        <div className='flex items-center space-x-2'>
          <Select value={botId} onValueChange={setBotId}>
            {botDefs.map(({ module: { id, displayName }, runtime: { Icon } }) => (
              <Select.Item key={id} value={id!}>
                <div className='flex items-center'>
                  <Icon className={mx(getSize(5), 'mr-2')} />
                  {displayName}
                </div>
              </Select.Item>
            ))}
          </Select>
          <Button className='mr-2' onClick={() => botId && botClient.startBot(botId, getBotEnvs(keyMap))}>
            Start
          </Button>
        </div>
        <div className='flex items-center space-x-2'>
          <Button onClick={() => botId && botClient.fetchImage()}>Pull Image</Button>
          <Button onClick={handleStopAll}>Stop</Button>
          <Button onClick={handleFlush}>Flush</Button>
          <Button onClick={() => refresh}>Refresh</Button>
        </div>
      </Toolbar>

      <div className='flex flex-col flex-1'>
        <Table
          columns={columns({ onStop: handleStop })}
          data={records}
          slots={{
            header: { className: 'bg-paper-1-bg' },
            row: { className: 'hover:bg-hover-bg odd:bg-table-rowOdd even:bg-table-rowEven' }
          }}
        />
      </div>

      {/* TODO(burdon): Progress bar. */}
      <div className='flex shrink-0 p-3'>{status}</div>
    </div>
  );
};
