//
// Copyright 2023 DXOS.org
//

import { AppWindow, Circle, Code, Robot } from '@phosphor-icons/react';
import React, { FC, useEffect, useState } from 'react';

import { Button } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { TableColumn, Table, Toolbar } from '@dxos/mosaic';
import { Module } from '@dxos/protocols/proto/dxos/config';
import { useMetagraph } from '@dxos/react-metagraph';
import { compareObject, compareString } from '@dxos/util';

// TODO(burdon): Type selector.

const iconTypes: { [index: string]: { Icon: FC<any>; color: string } } = {
  'dxos.org/type/bot': { Icon: Robot, color: 'text-green-400' },
  'dxos.org/type/frame': { Icon: AppWindow, color: 'text-orange-400' },
  'dxos.org/type/schema': { Icon: Code, color: 'text-blue-400' },
};

// TODO(burdon): Re-use in console.
const columns: TableColumn<Module>[] = [
  {
    Header: ' ',
    accessor: ({ type }) => type,
    width: 0,
    Cell: ({ value }: any) => {
      const { Icon, color } = iconTypes[value] ?? Circle;
      return <Icon weight='duotone' className={mx(getSize(6), color)} />;
    },
  },
  {
    Header: 'type',
    accessor: ({ type }) => type,
    width: 80,
  },
  {
    Header: 'module',
    accessor: ({ id, name }) => id ?? name,
    width: 160,
  },
  {
    Header: 'version',
    accessor: ({ build }) => build?.version,
    width: 80,
  },
  {
    Header: 'description',
    accessor: ({ description }) => description,
    width: 240,
  },
];

export const MetagraphPanel = () => {
  const client = useMetagraph();
  const [modules, setModules] = useState<Module[]>([]);
  const sortedModules = modules.sort(compareObject('name', compareString()));

  useEffect(() => {
    void handleRefresh();
  }, []);

  const handleRefresh = async () => {
    // TODO(burdon): Make type optional (frames, bots, apps).
    const { results: modules } = await client.modules.query();
    setModules(modules);
  };

  return (
    // TODO(burdon): Factor out panel layout.
    <div className='flex flex-1 flex-col px-2 overflow-hidden'>
      <Toolbar className='justify-between'>
        <Button onClick={handleRefresh}>Refresh</Button>
      </Toolbar>

      <Table
        columns={columns}
        data={sortedModules}
        slots={{
          header: { className: 'bg-paper-bg dark:bg-dark-paper-bg' },
          cell: { className: 'align-start py-1 font-mono font-thin' },
        }}
      />
    </div>
  );
};
