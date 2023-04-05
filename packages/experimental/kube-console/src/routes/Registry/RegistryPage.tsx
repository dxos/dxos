//
// Copyright 2023 DXOS.org
//

import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { ConfigProto } from '@dxos/config';
import { TableColumn, Table } from '@dxos/mosaic';
import { Button, getSize } from '@dxos/react-components';
import { alphabetical, alphabeticalByKey } from '@dxos/util';

import { Toolbar } from '../../components';
import { useKube } from '../../hooks';

// TODO(burdon): Get from KUBE config proto.
type Module = {
  name: string;
  build?: {
    version: string;
  };
  type: string;
  displayName: string;
  description: string;
  tags: string[];
};

const columns: (host: string | undefined) => TableColumn<Module>[] = (host) => {
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
      width: 40,
      Cell: ({ value }: { value: string[] }) => (
        <a target='_blank' rel='noreferrer' href={`https://${value}.${host}`}>
          <ArrowSquareOut className={getSize(6)} />
        </a>
      )
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

  if (!host) {
    columns.splice(2, 1);
  }

  return columns;
};

export const RegistryPage = () => {
  const kube = useKube();
  const [config, setConfig] = useState<ConfigProto>({});
  const [modules, setModules] = useState<Module[]>([]);
  const sortedModules = modules.sort(alphabeticalByKey('name'));

  useEffect(() => {
    void handleRefresh();
  }, []);

  const handleRefresh = async () => {
    const config = await kube.fetch('/dx/config');
    const { modules } = await kube.fetch<{ modules: Module[] }>('/dx/registry');
    setConfig(config);
    setModules(modules);
    console.log(JSON.stringify(modules, undefined, 2));
  };

  return (
    // TODO(burdon): Factor out panel layout.
    <div className='flex flex-col flex-1 overflow-hidden'>
      <Toolbar>
        <Button onClick={handleRefresh}>Refresh</Button>
      </Toolbar>

      {/* TODO(burdon): Theme. */}
      <Table
        columns={columns(config.runtime?.kube?.host)}
        data={sortedModules}
        slots={{
          header: { className: 'bg-paper-bg dark:bg-dark-paper-bg' },
          cell: { className: 'align-start font-mono font-thin p-0 m-1' }
        }}
      />
    </div>
  );
};
