//
// Copyright 2022 DXOS.org
//

import React, { useCallback } from 'react';

import { Item, PublicKey, Space } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';

import { LIST_ITEM_TYPE } from '../../model';
import { ListPrimitive } from '../ListPrimitive';

export interface ListProps {
  spaceKey: PublicKey;
  itemId: Item<ObjectModel>['id'];
}

export const List = ({ spaceKey, itemId }: ListProps) => {
  const selectItem = useCallback((itemId: string, space?: Space) => space?.database.select({ id: itemId }), []);
  const selectListItems = useCallback(
    (list?: Item<ObjectModel>) => list?.select().children().filter({ type: LIST_ITEM_TYPE }),
    []
  );
  const createListItem = useCallback(
    async (listId: string, space?: Space) =>
      space?.database.createItem({
        model: ObjectModel,
        type: LIST_ITEM_TYPE,
        parent: listId
      }),
    []
  );

  const deleteListItem = useCallback(async (listItemId: string, space?: Space) => {
    const item = await space?.database.getItem(listItemId);
    return item?.model.set('annotations.deleted', true);
  }, []);

  const updateItem = useCallback(
    (item: Item<ObjectModel>, updates: Record<string, string>) =>
      Promise.all(
        Object.keys(updates).map((prop) => {
          return item?.model.set(prop, updates[prop]);
        })
      ),
    []
  );

  return (
    <ListPrimitive
      {...{
        spaceKey,
        listId: itemId,
        selectList: selectItem,
        updateList: updateItem,
        selectListItems,
        selectListItem: selectItem,
        updateListItem: updateItem,
        onChangePeriod: 640,
        createListItem,
        deleteListItem
      }}
    />
  );
};
