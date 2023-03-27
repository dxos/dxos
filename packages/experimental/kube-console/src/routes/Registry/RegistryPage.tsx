//
// Copyright 2023 DXOS.org
//

import { ArrowSquareOut } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';
import { Column } from 'react-table';

import { ConfigProto } from '@dxos/config';
import { Button, getSize, Table } from '@dxos/react-components';
import { alphabetical, alphabeticalByKey } from '@dxos/util';

import { Toolbar } from '../../components';
import { useKube } from '../../hooks';

// TODO(burdon): Get from KUBE config proto.
type Service = {
  name: string;
  type: string;
  displayName: string;
  description: string;
  tags: string[];
};

const columns: (host: string | undefined) => Column<Service>[] = (host) => {
  const columns: Column<Service>[] = [
    {
      Header: 'module',
      accessor: ({ name }) => name,
      width: 100
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
            <span key={i} className='rounded-lg p-1 mr-2 text-xs bg-secondary-bg dark:bg-dark-secondary-bg'>
              {tag}
            </span>
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
  const [results, setResults] = useState<any>();
  const modules = results?.modules.sort(alphabeticalByKey('name'));

  useEffect(() => {
    void handleRefresh();
  }, []);

  const handleRefresh = async () => {
    const config = await kube.fetch('/dx/config');
    const results = await kube.fetch('/dx/registry');
    setConfig(config);
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
        columns={columns(config.runtime?.kube?.host)}
        data={modules}
        slots={{
          header: { className: 'bg-paper-bg dark:bg-dark-paper-bg' },
          cell: { className: 'align-start font-mono font-thin' }
        }}
      />
    </div>
  );
};
