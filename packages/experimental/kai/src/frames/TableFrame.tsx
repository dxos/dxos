//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';
import { Column } from 'react-table';

import { DocumentBase, EchoObject, id, TypeFilter } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { Searchbar, Selector, SelectorOption, Table } from '../components';
import { useSpace } from '../hooks';
import { Contact, Organization, Project } from '../proto';

type ColumnType<T extends DocumentBase> = SelectorOption & {
  filter: TypeFilter<any>;
  subFilter?: (match?: string) => (object: T) => boolean;
  columns: Column<EchoObject>[];
};

// TODO(burdon): Infer columns for generic table container.
const types: ColumnType<any>[] = [
  {
    id: 'organization',
    title: 'Organization',
    filter: Organization.filter(),
    subFilter: (match?: string) => (object: Organization) => stringMatch(object.name, match),
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
    subFilter: (match?: string) => (object: Project) => stringMatch(object.title, match),
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
    subFilter: (match?: string) => (object: Contact) => stringMatch(object.name, match),
    columns: [
      { Header: 'ID', accessor: (item: any) => item[id] },
      { Header: 'Name', accessor: 'name' as any },
      { Header: 'Username', accessor: 'username' as any },
      { Header: 'Email', accessor: 'email' as any },
      { Header: 'ZIP', accessor: 'address.zip' as any }
    ]
  }
];

const getType = (id: string): ColumnType<any> => types.find((type) => type.id === id)!;

// TODO(burdon): Normalize with Kanban filters.
const stringMatch = (value?: string, match?: string) =>
  !match?.length || value?.toLocaleLowerCase().indexOf(match) !== -1;

const TableFrame = () => {
  const space = useSpace();
  const [type, setType] = useState<ColumnType<any>>(getType('contact'));
  const [text, setText] = useState<string>();
  const objects = useQuery(space, type.filter).filter(type.subFilter?.(text) ?? Boolean);

  const handleSearch = (text: string) => {
    setText(text);
  };

  const handleSelect = (id?: string) => {
    if (id) {
      setType(getType(id));
    }
  };

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='flex p-3 border-b border-slate-200 border-solid'>
        <div className='flex'>
          <div className='mr-2'>
            <Selector options={types} value={type.id} onSelect={handleSelect} />
          </div>
          <div>
            <Searchbar onSearch={handleSearch} />
          </div>
        </div>
      </div>
      {/* <div className='flex flex-1 overflow-hidden'> */}
      <Table<EchoObject> columns={type.columns} data={objects} />
      {/* </div> */}
    </div>
  );
};

export default TableFrame;