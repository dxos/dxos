//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type TableColumn, Table } from '@dxos/mosaic';
import { Button } from '@dxos/react-ui';
import { compareObject, compareString } from '@dxos/util';

import { Toolbar } from '../../components';
import { useKube } from '../../hooks';

// TODO(burdon): Get from KUBE config proto.
type Service = {
  name: string;
  type: string;
  status: string;
  addresses: string[];
};

const columns: TableColumn<Service>[] = [
  {
    Header: 'service',
    accessor: ({ name }) => name,
    width: 100,
  },
  {
    Header: 'type',
    accessor: ({ type }) => type,
    width: 80,
  },
  {
    Header: 'status',
    accessor: ({ status }) => status,
    width: 80,
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
    ),
  },
];

export const StatusPage = () => {
  const kube = useKube();
  const [services, setServices] = useState<Service[]>([]);
  const soredServices = services.sort(compareObject('name', compareString()));

  useEffect(() => {
    void handleRefresh();
  }, []);

  const handleRefresh = async () => {
    const { services } = await kube.fetch<{ services: Service[] }>('/dx/status');
    setServices(services);
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
        data={soredServices}
        slots={{
          header: { className: 'bg-paper-bg dark:bg-dark-paper-bg' },
          cell: { className: 'align-start font-mono font-thin' },
        }}
      />
    </div>
  );
};
