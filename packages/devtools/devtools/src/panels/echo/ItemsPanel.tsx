//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Item } from '@dxos/client';
import { truncateKey } from '@dxos/debug';
import { FolderHierarchy, FolderHierarchyItem, Searchbar } from '@dxos/kai';
import { PublicKey } from '@dxos/keys';
import { MessengerModel } from '@dxos/messenger-model';
import { Model } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { useSpace, useSelection, useSpaces } from '@dxos/react-client';
import { TextModel } from '@dxos/text-model';

import { JsonView, PublicKeySelector } from '../../components';

export const ItemsPanel = () => {
  const spaces = useSpaces();

  const [selectedSpaceKey, setSelectedSpaceKey] = useState<PublicKey>();
  const space = useSpace(selectedSpaceKey);
  const items = useSelection(space?.select()) ?? [];

  const [selectedItem, setSelectedItem] = useState<Item<any>>();

  const [text, setText] = useState<string>('');
  const handleSearch = (text: string) => {
    setText(text);
  };

  const getHierarchicalItem = (dbItem: Item<any>): FolderHierarchyItem => {
    return {
      id: dbItem.id,
      title: (modelToObject(dbItem.model) as any)?.['@type'] ?? dbItem.type ?? dbItem.modelType ?? 'undefined',
      items: dbItem.children.map((child) => getHierarchicalItem(child)),
      value: dbItem
    };
  };

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <div className='flex flex-1 p-3 border-b border-slate-200 border-solid'>
        <div className='w-1/3 mr-2'>
          <PublicKeySelector
            keys={spaces.map(({ key }) => key)}
            value={selectedSpaceKey}
            placeholder={'Select space'}
            onSelect={(key) => {
              key && setSelectedSpaceKey(key);
            }}
          />
        </div>
        <div>
          <Searchbar onSearch={handleSearch} />
        </div>
      </div>
      <div className='flex h-full'>
        <div className='flex flex-col w-1/3 overflow-auto'>
          <FolderHierarchy
            items={items
              .filter((item) => !item.parent)
              .map(getHierarchicalItem)
              .filter((item) => item.title?.includes(text) ?? true)}
            titleClassName={'text-black text-lg'}
            onSelect={(item) => setSelectedItem(item.value)}
            selected={selectedItem?.id}
          />
        </div>

        <div className='flex flex-1 w-2/3 overflow-auto'>{selectedItem && <ItemDetails item={selectedItem} />}</div>
      </div>
    </div>
  );
};

interface ItemDetailsProps {
  item: Item<Model<any>>;
}

const ItemDetails = ({ item }: ItemDetailsProps) => (
  <div className='align-top mt-2 ml-2'>
    <table>
      <tbody>
        <tr>
          <td>ID</td>
          <td>{truncateKey(item.id, 8)}</td>
        </tr>
        <tr>
          <td>Model</td>
          <td>{item.model.modelMeta.type}</td>
        </tr>
        <tr>
          <td>Type</td>
          <td>{item.type}</td>
        </tr>
        <tr>
          <td>Deleted</td>
          <td>{item.deleted ? 'Yes' : 'No'}</td>
        </tr>
        <tr>
          <td className='align-top'>Properties</td>
          <td>
            <JsonView data={modelToObject(item.model)} />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

const modelToObject = (model: Model<any>) => {
  if (model instanceof ObjectModel) {
    return model.toObject();
  } else if (model instanceof TextModel) {
    return model.textContent;
  } else if (model instanceof MessengerModel) {
    return model.messages;
  }

  return model.toJSON();
};
