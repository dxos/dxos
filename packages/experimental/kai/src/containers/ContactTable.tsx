//
// Copyright 2022 DXOS.org
//

import React, { useMemo } from 'react';
import { Column } from 'react-table';

import { EchoObject } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { Searchbar, Table } from '../components';
import { useSpace } from '../hooks';
import { Contact } from '../proto';

export const ContactTable = () => {
  const { space } = useSpace();
  const contacts = useQuery(space, Contact.filter());
  const columns = useMemo<Column<EchoObject>[]>(
    () => [
      { Header: 'Name', accessor: 'name' as any },
      { Header: 'Username', accessor: 'username' as any },
      { Header: 'Email', accessor: 'email' as any },
      { Header: 'ZIP', accessor: 'address.zip' as any, maxWidth: 80 }
    ],
    []
  );

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='flex p-2'>
        <div>
          <Searchbar />
        </div>
      </div>
      <div className='flex flex-1 overflow-hidden'>
        <Table columns={columns} data={contacts} />{' '}
      </div>
    </div>
  );
};
