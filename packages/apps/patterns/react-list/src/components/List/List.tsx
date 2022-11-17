//
// Copyright 2022 DXOS.org
//

import React, { useCallback } from 'react';

import { Item, PublicKey, Space } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';
import { useSelection, useSpace } from '@dxos/react-client';
import { Loading } from '@dxos/react-ui';
import { useTranslation } from '@dxos/react-uikit';

import { LIST_ITEM_TYPE } from '../../model';
import {
  ListPrimitive,
  ListAction,
  ListItems,
  isListItemChangedAction,
  isListItemDeletedAction,
  isListItemCreatedAction,
  ListItemProps,
  ListPrimitiveProps
} from '../ListPrimitive';

interface ListLoadedProps {
  space: Space;
  list: Item<ObjectModel>;
  listItems: Item<ObjectModel>[];
}

export interface ListProps {
  spaceKey: PublicKey;
  itemId: Item<ObjectModel>['id'];
}

const ListLoaded = ({ space, list, listItems: propsListItems }: ListLoadedProps) => {
  const listItems = useSelection(list?.select().children().filter({ type: LIST_ITEM_TYPE })) ?? propsListItems;

  const onAction = useCallback(
    async (action: ListAction) => {
      if (isListItemDeletedAction(action)) {
        const subject = space.database.getItem(action.deleted.id);
        await subject?.model.set('annotations.deleted', true);
        return subject?.delete();
      } else if (isListItemCreatedAction(action)) {
        // do nothing?
      } else if (isListItemChangedAction(action)) {
        const subject = space.database.getItem(action.listItemId);
        return Promise.all(
          (Object.keys(action.next) as (keyof ListItemProps)[]).map((prop) => {
            return subject?.model.set(prop, action.next[prop]);
          })
        );
      } else {
        return Promise.all(
          (Object.keys(action.next) as (keyof ListPrimitiveProps)[]).map((prop) => {
            return list?.model.set(prop, action.next[prop]);
          })
        );
      }
    },
    [list, listItems]
  );

  const createListItemId = useCallback(async () => {
    const listItem = await space?.database.createItem({
      model: ObjectModel,
      type: LIST_ITEM_TYPE,
      parent: list.id
    });
    return listItem.id;
  }, [space]);

  return (
    <ListPrimitive
      {...{
        id: list.id,
        title: list.model.get('title') ?? '',
        description: list.model.get('description') ?? '',
        items: (listItems ?? [])
          .filter((item) => !(item.deleted || item.model.get('annotations.deleted')))
          .reduce((acc: ListItems, item) => {
            acc[item.id] = {
              title: item.model.get('title'),
              description: item.model.get('description'),
              annotations: item.model.get('annotations')
            };
            return acc;
          }, {}),
        onAction,
        createListItemId
      }}
    />
  );
};

export const List = ({ spaceKey, itemId }: ListProps) => {
  const { t } = useTranslation('uikit');

  const space = useSpace(spaceKey);
  const list = (useSelection(space?.database.select({ id: itemId })) ?? [])[0];
  const listItems = useSelection(list?.select().children().filter({ type: LIST_ITEM_TYPE }));

  // TODO(thure): this should become `Suspense` when the above hooks support it
  return space && list && listItems ? (
    <ListLoaded {...{ space, list, listItems }} />
  ) : (
    <Loading label={t('generic loading label')} />
  );
};
