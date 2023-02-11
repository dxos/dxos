//
// Copyright 2023 DXOS.org
//

import React, { ChangeEvent, useCallback, useState, KeyboardEvent, ComponentPropsWithoutRef } from 'react';

import { ThemeProvider, useId, randomString, arrayMove } from '@dxos/react-components';

import { appkitTranslations } from '../../translations';
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
            id: `${listId}--listItem-${randomString()}`,
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
        if (nextItemTitle.length > 0) {
          console.log('[add item]', itemOrder, items);
          const addedItem = {
            id: `${listId}--listItem-${randomString()}`,
            title: nextItemTitle,
            completed: false
          };
          setItems({ ...items, [addedItem.id]: addedItem });
          setItemOrder([...itemOrder, addedItem.id]);
          setNextItemTitle('');
        }
      }, [items, itemOrder, nextItemTitle]);

      const deleteItem = useCallback(
        (deletedId: string) => {
          const nextItemOrder = itemOrder.filter((id) => id !== deletedId);
          const { [deletedId]: _deletedItem, ...nextItems } = items;
          console.log('[deleting]', deletedId, nextItemOrder, nextItems);
          setItemOrder(nextItemOrder);
          setItems(nextItems);
        },
        [items, itemOrder]
      );

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
          onMoveItem={(oldIndex, newIndex) => setItemOrder(arrayMove(itemOrder, oldIndex, newIndex))}
          nextItemTitle={nextItemTitle}
          onChangeNextItemTitle={({ target: { value } }) => setNextItemTitle(value)}
          slots={{
            root: hostAttrs as ComponentPropsWithoutRef<'div'>,
            addItemInput: { input: { ...itemAttrs, onKeyDown: onAddItemKeyDown } },
            addItemButton: { disabled: nextItemTitle.length < 1 }
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
                  onClickDelete: () => deleteItem(id),
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
      <ThemeProvider resourceExtensions={[appkitTranslations]}>
        <EditableListInstance />
        <EditableListInstance />
      </ThemeProvider>
    );
  },
  args: {}
};
