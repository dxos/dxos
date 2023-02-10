//
// Copyright 2023 DXOS.org
//

import React, { ChangeEvent, useCallback, useState, KeyboardEvent, ComponentPropsWithoutRef } from 'react';

import { useId } from '@dxos/react-components';

import { EditableList, EditableListItem, useEditableListKeyboardInteractions } from './EditableList';

export default {
  component: EditableList
} as any;

type EditableListItemData = { id: string; title: string; completed: boolean };

export const Default = {
  render: ({ ...args }) => {
    const EditableListInstance = () => {
      const listId = useId('L');
      const [nextItemTitle, setNextItemTitle] = useState('');
      const [items, setItems] = useState<Record<string, EditableListItemData>>(
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
      const updateItem = (id: string, props: Partial<EditableListItemData>) => {
        setItems({ ...items, [id]: Object.assign({}, items[id], props) });
      };

      const { hostAttrs, itemAttrs, onListItemInputKeyDown } = useEditableListKeyboardInteractions(listId);

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
        <EditableList
          {...args}
          id={listId}
          labelId='excluded'
          completable
          onClickAdd={addItem}
          itemIdOrder={itemOrder}
          onChangeItemIdOrder={(nextOrder: string[]) => {
            setItemOrder(nextOrder);
          }}
          nextItemTitle={nextItemTitle}
          onChangeNextItemTitle={({ target: { value } }) => setNextItemTitle(value)}
          slots={{
            root: hostAttrs as ComponentPropsWithoutRef<'div'>,
            addItem: { input: { ...itemAttrs, onKeyDown: onAddItemKeyDown } }
          }}
        >
          {itemOrder.map((id) => {
            const { title, completed } = items[id];
            return (
              <EditableListItem
                key={id}
                slots={{ input: { input: { ...itemAttrs, onKeyDown: onListItemInputKeyDown } } }}
                {...{
                  id,
                  title,
                  onChangeTitle: ({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
                    updateItem(id, { title: value }),
                  completed,
                  onChangeCompleted: (nextCompleted: boolean) => updateItem(id, { completed: nextCompleted })
                }}
              />
            );
          })}
        </EditableList>
      );
    };

    return (
      <>
        <EditableListInstance />
        <EditableListInstance />
      </>
    );
  },
  args: {}
};
