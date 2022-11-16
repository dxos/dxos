//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Item } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';

import { ListPrimitive, ListAction, isListItemChangedAction } from '../ListPrimitive';

export interface ListProps {
  item: Item<ObjectModel>;
}

export const List = ({ item }: ListProps) => {
  const onAction = useCallback(
    async (action: ListAction) => {
      if (isListItemChangedAction(action)) {
        console.log('[set]', `items.${action.listItemId}`, action.next);
        await item.model.set(`items.${action.listItemId}`, action.next);
      } else {
        await Promise.all(
          (Object.keys(action.next) as (keyof ListAction['next'])[]).map((prop) => {
            console.log('[set]', prop, action.next[prop]);
            return item.model.set(prop, action.next[prop]);
          })
        );
      }
    },
    [item]
  );

  const { id, items, order } = useMemo(
    () => ({
      id: item.id,
      items: item.model.get('items'),
      order: item.model.get('order')
    }),
    [item]
  );

  return <ListPrimitive {...{ id, items, order, onAction }} />;
};
