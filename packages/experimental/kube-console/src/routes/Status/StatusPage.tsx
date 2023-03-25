//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { Column } from 'react-table';

import { Button, Table } from '@dxos/react-components';
import { alphabetical } from '@dxos/util';

import { Toolbar } from '../../components';
import { useKube } from '../../hooks';

// TODO(burdon): Get from KUBE config proto.
type Service = {
  name: string;
  type: string;
  status: string;
  addresses: string[];
};

const columns: Column<Service>[] = [
  {
    Header: 'service',
    accessor: ({ name }) => name,
    width: 80
  },
  {
    Header: 'type',
    accessor: ({ type }) => type,
    width: 80
  },
  {
    Header: 'status',
    accessor: ({ status }) => status,
    width: 80
  },
  {
    Header: 'addresses',
    accessor: ({ addresses }) => addresses,
    width: 240,
    Cell: ({ value }: { value: string[] }) => (
      <div>
        {value.map((address, i) => (
          <div key={i}>{address}</div>
        ))}
      </div>
    )
  }
];

export const StatusPage = () => {
  const kube = useKube();
  const [results, setResults] = useState<any>();
  const services = results?.services.sort(alphabetical('name'));

  useEffect(() => {
    void handleRefresh();
  }, []);

  const handleRefresh = async () => {
    const results = await kube.fetch('/dx/status');
    setResults(results);
  };

  return (
    // TODO(burdon): Factor out panel layout.
    <div className='flex flex-col flex-1 overflow-hidden'>
      <Toolbar>
        <Button onClick={handleRefresh}>Refresh</Button>
      </Toolbar>

      {/* TODO(burdon): Theme. */}
      <Table
        columns={columns}
        data={services}
        slots={{
          header: { className: 'bg-black' },
          cell: { className: 'align-start font-mono font-thin' }
        }}
      />
    </div>
  );
};
