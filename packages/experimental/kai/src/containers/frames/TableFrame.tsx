//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';
import { Column } from 'react-table';

import { EchoObject, id, TypeFilter } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { Searchbar, Selector, SelectorOption, Table } from '../../components';
import { useSpace } from '../../hooks';
import { Contact, Organization, Project } from '../../proto';

type ColumnType = SelectorOption & {
  filter: TypeFilter<any>;
  columns: Column<EchoObject>[];
};

// TODO(burdon): Infer columns for generic table container.
const types: ColumnType[] = [
  {
    id: 'organization',
    title: 'Organization',
    filter: Organization.filter(),
    columns: [
      { Header: 'ID', accessor: (item: any) => item[id] },
      { Header: 'Name', accessor: 'name' as any },
      { Header: 'City', accessor: 'address.city' as any },
      { Header: 'Web', accessor: 'website' }
    ]
  },
  {
    id: 'project',
    title: 'Project',
    filter: Project.filter(),
    columns: [
      { Header: 'ID', accessor: (item: any) => item[id] },
      { Header: 'Name', accessor: 'title' as any },
      { Header: 'URL', accessor: 'url' }
    ]
  },
  {
    id: 'contact',
    title: 'Contact',
    filter: Contact.filter(),
    columns: [
      { Header: 'ID', accessor: (item: any) => item[id] },
      { Header: 'Name', accessor: 'name' as any },
      { Header: 'Username', accessor: 'username' as any },
      { Header: 'Email', accessor: 'email' as any },
      { Header: 'ZIP', accessor: 'address.zip' as any }
    ]
  }
];

const getType = (id: string): ColumnType => types.find((type) => type.id === id)!;

export const TableFrame = () => {
  const { space } = useSpace();
  const [type, setType] = useState<ColumnType>(getType('contact'));
  const contacts = useQuery(space, type.filter);

  const handleSelect = (id?: string) => {
    if (id) {
      setType(getType(id));
    }
  };

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='flex p-3'>
        <div className='flex'>
          <div className='mr-2'>
            <Selector options={types} value={type.id} onSelect={handleSelect} />
          </div>
          <div>
            <Searchbar />
          </div>
        </div>
      </div>

      <div className='flex flex-1 overflow-hidden'>
        <Table columns={type.columns} data={contacts} />{' '}
      </div>
    </div>
  );
};
