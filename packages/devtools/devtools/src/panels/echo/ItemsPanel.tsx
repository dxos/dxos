//
// Copyright 2020 DXOS.org
//

import { Cube, TextT } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { DocumentModel, TypedObject, TextModel, PublicKey } from '@dxos/client';
import { truncateKey } from '@dxos/debug';
import { TableColumn } from '@dxos/mosaic';
import { TreeViewItem, Searchbar } from '@dxos/react-appkit';
import { useQuery } from '@dxos/react-client';

import { JsonView, MasterDetailTable, PanelContainer, Toolbar } from '../../components';
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

// TODO(burdon): Rationalize with new API.
const getItemType = (doc: TypedObject) => (doc.toJSON()['@model'] === TextModel.meta.type ? 'Text' : doc.__typename);
const getItemDetails = (item: TypedObject) => ({
  id: truncateKey(item.id),
  type: item.__typename,
  deleted: String(Boolean(item.__deleted)),
  properties: <JsonView data={item.toJSON()} />,
});

const getObjectIcon = (item: TypedObject) => {
  const model = item.toJSON()['@model'];
  switch (model) {
    case DocumentModel.meta.type:
      return Cube;
    case TextModel.meta.type:
      return TextT;
    default:
      return undefined;
  }
};

const getHierarchicalItem = (item: TypedObject): TreeViewItem => ({
  id: item.id,
  title: getItemType(item) || 'Unknown type',
  value: item,
  Icon: getObjectIcon(item),
});

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
