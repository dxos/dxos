//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Item, PublicKey, Space } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';
import { useSelection, useSpace } from '@dxos/react-client';
import { Loading } from '@dxos/react-ui';
import { useTranslation } from '@dxos/react-uikit';

import { LIST_ITEM_TYPE } from '../../model';
import { ListPrimitive, ListAction, ListItems, isListItemChangedAction } from '../ListPrimitive';

interface ListLoadedProps {
  space: Space;
  list: Item<ObjectModel>;
  listItems: Item<ObjectModel>[];
}

export interface ListProps {
  spaceKey: PublicKey;
  itemId: Item<ObjectModel>['id'];
}

const ListLoaded = ({ space, list, listItems }: ListLoadedProps) => {
  const onAction = useCallback(
    async (action: ListAction) => {
      const subject = isListItemChangedAction(action) ? listItems.find(({ id }) => id === action.listItemId) : list;
      await Promise.all(
        (Object.keys(action.next) as (keyof ListAction['next'])[]).map((prop) => {
          console.log('[set]', prop, action.next[prop]);
          return subject?.model.set(prop, action.next[prop]);
        })
      );
    },
    [list]
  );

  const { id, order } = useMemo(
    () => ({
      id: list?.id ?? '',
      order: list?.model.get('order') ?? []
    }),
    [list]
  );

  const items = useMemo(
    () =>
      listItems.reduce((acc: ListItems, item) => {
        acc[item.id] = {
          title: item.model.get('title'),
          description: item.model.get('description'),
          annotations: item.model.get('annotations')
        };
        return acc;
      }, {}),
    [listItems]
  );

  const createListItemId = useCallback(async () => {
    console.log('[creating list item]');
    const listItem = await space?.database.createItem({
      model: ObjectModel,
      type: LIST_ITEM_TYPE
    });
    await listItem.setParent(list.id);
    console.log('[created]', listItem);
    return listItem.id;
  }, [space]);

  return <ListPrimitive {...{ id, items, order, onAction, createListItemId }} />;
};

export const List = ({ spaceKey, itemId }: ListProps) => {
  const { t } = useTranslation('uikit');

  const space = useSpace(spaceKey);
  const list = space?.database.getItem(itemId);
  const listItems = useSelection(list?.select().children().filter({ type: LIST_ITEM_TYPE }));

  // TODO(thure): this should become `Suspense` when the above hooks support it
  return space && list && listItems ? (
    <ListLoaded {...{ space, list, listItems }} />
  ) : (
    <Loading label={t('generic loading label')} />
  );
};
