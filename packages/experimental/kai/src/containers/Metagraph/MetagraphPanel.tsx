//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { TableColumn, Table } from '@dxos/mosaic';
import { Module } from '@dxos/protocols/proto/dxos/config';
import { Button } from '@dxos/react-components';
import { useMetagraph } from '@dxos/react-metagraph';
import { alphabetical, alphabeticalByKey } from '@dxos/util';

// TODO(burdon): Re-use in console.
const columns: TableColumn<Module>[] = [
  {
    Header: 'module',
    accessor: ({ name }) => name,
    width: 120
  },
  {
    Header: 'version',
    accessor: ({ build }) => build?.version,
    width: 80
  },
  {
    Header: 'type',
    accessor: ({ type }) => type,
    width: 80
  },
  {
    Header: 'link',
    accessor: ({ name }) => name,
    width: 40
  },
  {
    Header: 'tags',
    accessor: ({ tags }) => tags,
    width: 100,
    Cell: ({ value }: { value: string[] }) => (
      <div>
        {value.sort(alphabetical()).map((tag, i) => (
          <div key={i} className='pr-1'>
            <span className='rounded-md p-1 text-xs bg-secondary-bg dark:bg-dark-secondary-bg'>{tag}</span>
          </div>
        ))}
      </div>
    )
  },
  // TODO(burdon): Column property (monospace, etc.)
  {
    Header: 'description',
    accessor: ({ description }) => description,
    width: 240
  }
];

export const MetagraphPanel = () => {
  const client = useMetagraph();
  const [modules, setModules] = useState<Module[]>([]);
  const sortedModules = modules.sort(alphabeticalByKey('name'));
  console.log(JSON.stringify(sortedModules, undefined, 2));

  useEffect(() => {
    void handleRefresh();
  }, []);

  const handleRefresh = async () => {
    // TODO(burdon): Make type optional (frames, bots, apps).
    const { results: modules } = await client.modules.query({ type: 'dxos:type/frame' });
    setModules(modules);
  };

  return (
    // TODO(burdon): Factor out panel layout.
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div>
        <Button onClick={handleRefresh}>Refresh</Button>
      </div>

      <Table
        columns={columns}
        data={sortedModules}
        slots={{
          header: { className: 'bg-paper-bg dark:bg-dark-paper-bg' },
          cell: { className: 'align-start font-mono font-thin p-0 m-1' }
        }}
      />
    </div>
  );
};
