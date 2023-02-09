//
// Copyright 2023 DXOS.org
//

import React, { ChangeEvent, useCallback, useState, KeyboardEvent, ComponentPropsWithoutRef } from 'react';

import { useId } from '@dxos/react-components';

import { CrudList, CrudListItem, useCrudListKeyboardInteractions } from './CrudList';

export default {
  component: CrudList
} as any;

type CrudListItemData = { id: string; title: string; completed: boolean };

export const Default = {
  render: ({ ...args }) => {
    const CrudListInstance = () => {
      const listId = useId('L');
      const [nextItemTitle, setNextItemTitle] = useState('');
      const [items, setItems] = useState<Record<string, CrudListItemData>>(
        [...Array(6)].reduce((acc, _, index) => {
          const item = {
            id: `${listId}--listItem-${index}`,
            title: `${listId} item ${index + 1}`,
            completed: false
          };
          acc[item.id] = item;
          return acc;
        }, {})
      );
      const [itemOrder, setItemOrder] = useState(Object.keys(items));
      const updateItem = (id: string, props: Partial<CrudListItemData>) => {
        setItems({ ...items, [id]: Object.assign({}, items[id], props) });
      };

      const { hostAttrs, itemAttrs, onListItemInputKeyDown } = useCrudListKeyboardInteractions(listId);

      const addItem = useCallback(() => {
        const addedItem = {
          id: `${listId}--listItem-${itemOrder.length}`,
          title: nextItemTitle,
          completed: false
        };
        setItems({ ...items, [addedItem.id]: addedItem });
        setItemOrder([...itemOrder, addedItem.id]);
        setNextItemTitle('');
      }, [items, itemOrder, nextItemTitle]);

      const onAddItemKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') {
            addItem();
          } else {
            onListItemInputKeyDown(event);
          }
        },
        [onListItemInputKeyDown, addItem]
      );

      return (
        <CrudList
          {...args}
          id={listId}
          labelId='excluded'
          completable
          onClickAdd={addItem}
          itemIdOrder={itemOrder}
          onItemIdOrderChange={(nextOrder: string[]) => {
            setItemOrder(nextOrder);
          }}
          nextItemTitle={nextItemTitle}
          onNextItemTitleChange={({ target: { value } }) => setNextItemTitle(value)}
          slots={{
            root: hostAttrs as ComponentPropsWithoutRef<'div'>,
            addItem: { input: { ...itemAttrs, onKeyDown: onAddItemKeyDown } }
          }}
        >
          {itemOrder.map((id) => {
            const { title, completed } = items[id];
            return (
              <CrudListItem
                key={id}
                slots={{ input: { input: { ...itemAttrs, onKeyDown: onListItemInputKeyDown } } }}
                {...{
                  id,
                  title,
                  onTitleChange: ({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
                    updateItem(id, { title: value }),
                  completed,
                  onCompletedChange: (nextCompleted: boolean) => updateItem(id, { completed: nextCompleted })
                }}
              />
            );
          })}
        </CrudList>
      );
    };

    return (
      <>
        <CrudListInstance />
        <CrudListInstance />
      </>
    );
  },
  args: {}
};
