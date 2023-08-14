//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Toolbar } from '@dxos/aurora';
import { TableColumn } from '@dxos/mosaic';
import { PublicKey } from '@dxos/react-client';
import { TypedObject, useQuery } from '@dxos/react-client/echo';

import { MasterDetailTable, PanelContainer, Searchbar } from '../../components';
import { SpaceSelector } from '../../containers';
import { useDevtoolsState } from '../../hooks';

const textFilter = (text?: string) => {
  if (!text) {
    return () => true;
  }

  // TODO(burdon): Structured query (e.g., "type:Text").
  const matcher = new RegExp(text, 'i');
  return (item: TypedObject) => {
    const model = item.toJSON()['@model'];
    let match = false;
    match ||= !!model?.match(matcher);
    match ||= !!item.__typename?.match(matcher);
    match ||= !!String(item.title).match(matcher);
    return match;
  };
};

const columns: TableColumn<TypedObject>[] = [
  {
    Header: 'Id',
    width: 60,
    Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
    accessor: (item) => {
      const id = item.id;
      return `${PublicKey.from(id).truncate()}`;
    },
  },
  {
    Header: 'Model',
    width: 120,
    Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
    accessor: (item) => item.toJSON()['@model'],
  },
  {
    Header: 'Type',
    width: 120,
    Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
    accessor: (item) => item.__typename ?? '',
  },
];

const ItemsPanel = () => {
  const { space } = useDevtoolsState();
  // TODO(burdon): Sort by type?
  // TODO(burdon): Filter deleted.
  const items = useQuery(space);
  const [filter, setFilter] = useState('');

  return (
    <PanelContainer
      toolbar={
        <Toolbar>
          <SpaceSelector />
          <Searchbar onSearch={setFilter} />
        </Toolbar>
      }
    >
      <MasterDetailTable<TypedObject> columns={columns} data={items.filter(textFilter(filter))} />
    </PanelContainer>
  );
};

export default ItemsPanel;
