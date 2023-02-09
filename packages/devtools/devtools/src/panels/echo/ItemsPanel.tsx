//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Item } from '@dxos/client';
import { truncateKey } from '@dxos/debug';
import { TreeView, TreeViewItem, Searchbar } from '@dxos/kai';
import { MessengerModel } from '@dxos/messenger-model';
import { Model } from '@dxos/model-factory';
import { DocumentModel } from '@dxos/document-model';
import { TextModel } from '@dxos/text-model';

import { DetailsTable, JsonView } from '../../components';
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

const modelToObject = (model: Model<any>) => {
  if (model instanceof DocumentModel) {
    return model.toObject();
  } else if (model instanceof TextModel) {
    return model.textContent;
  } else if (model instanceof MessengerModel) {
    return model.messages;
  }

  return model.toJSON();
};

// TODO(burdon): Rationalize with new API.
const getItemType = (item: Item<any>) =>
  (modelToObject(item.model) as any)?.['@type'] ?? item.type ?? item.modelType ?? 'undefined';

const getItemDetails = (item: Item<any>) => ({
  id: truncateKey(item.id, 4),
  model: item.model.modelMeta.type,
  type: (modelToObject(item.model) as any)?.['@type'],
  deleted: String(Boolean(item.deleted)),
  properties: <JsonView data={modelToObject(item.model)} />
});

const getHierarchicalItem = (item: Item<any>): TreeViewItem => ({
  id: item.id,
  title: getItemType(item),
  items: item.children.map((child) => getHierarchicalItem(child)),
  value: item
});

const ItemsPanel = () => {
  const { space } = useDevtoolsState();
  // TODO(burdon): Sort by type?
  // TODO(burdon): Filter deleted.
  const items = [] as any //useSelection(space?.select()) ?? [];
  const [selectedItem, setSelectedItem] = useState<Item<any>>();
  const [filter, setFilter] = useState('');

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <SpaceToolbar>
        <div className='w-1/2'>
          <Searchbar onSearch={setFilter} />
        </div>
      </SpaceToolbar>

      <div className='flex h-full overflow-hidden'>
        <div className='flex flex-col w-1/3 overflow-auto border-r'>
          {/* TODO(burdon): Convert to list with new API. */}
          <TreeView
            items={items
              .filter((item: any) => !item.parent)
              .map(getHierarchicalItem)
              .filter(textFilter(filter))}
            titleClassName={'text-black text-sm'}
            onSelect={(item: any) => setSelectedItem(item.value)}
            selected={selectedItem?.id}
          />
        </div>

        {selectedItem && (
          <div className='flex flex-1 flex-col w-2/3 overflow-auto'>
            <DetailsTable object={getItemDetails(selectedItem)} expand />
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemsPanel;
