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

import { JsonView, MasterTable } from '../../components';
import { SpaceToolbar } from '../../containers';
import { useDevtoolsState } from '../../hooks';
// TODO(burdon): Factor out.

const textFilter = (text?: string) => {
  if (!text) {
    return () => true;
  }

  const matcher = new RegExp(text, 'i');
  return (item: TreeViewItem) => {
    const match = item.title?.match(matcher);
    return match !== null;
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
    accessor: (item) => {
      const id = item.id;
      return `${PublicKey.from(id).truncate()}`;
    },
  },
  {
    Header: 'Model',
    width: 120,
    accessor: (item) => item.toJSON()['@model'],
  },
  {
    Header: 'Type',
    width: 120,
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
    <div className='flex flex-1 flex-col overflow-hidden'>
      <SpaceToolbar>
        <div className='w-1/2'>
          <Searchbar onSearch={setFilter} />
        </div>
      </SpaceToolbar>

      <div className='flex h-full overflow-hidden'>
        {/* TODO(burdon): Convert to list with new API. */}
        <MasterTable<TypedObject>
          columns={columns}
          data={items.filter(textFilter(filter))}
          slots={{ selected: { className: 'bg-slate-200' } }}
        />
      </div>
    </div>
  );
};

export default ItemsPanel;
