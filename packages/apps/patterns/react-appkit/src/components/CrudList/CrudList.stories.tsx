//
// Copyright 2023 DXOS.org
//

import React, { ChangeEvent, useState } from 'react';

import { useId } from '@dxos/react-components';

import { CrudList, CrudListItem } from './CrudList';

export default {
  component: CrudList
} as any;

type CrudListItemData = { id: string; title: string; completed: boolean };

export const Default = {
  render: ({ ...args }) => {
    const CrudListInstance = () => {
      const listId = useId('L');
      const [title, setTitle] = useState(listId);
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

      return (
        <CrudList
          {...args}
          id={listId}
          title={title}
          onTitleChange={({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
            setTitle(value);
          }}
          itemIdOrder={itemOrder}
          onItemIdOrderChange={(nextOrder: string[]) => {
            setItemOrder(nextOrder);
          }}
        >
          {itemOrder.map((id) => {
            const { title, completed } = items[id];
            return (
              <CrudListItem
                key={id}
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
