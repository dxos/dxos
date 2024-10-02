//
// Copyright 2024 DXOS.org
//

import { type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { type Meta, type StoryObj } from '@storybook/react';
import React, { useState, useCallback } from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Stack } from './Stack';
import { StackItem } from './StackItem';

type KanbanItem = {
  id: string;
  column: number;
  row: number;
};

type KanbanColumn = {
  id: string;
  items: KanbanItem[];
};

const KanbanBlock = ({ item }: { item: KanbanItem }) => {
  return (
    <div className='is-64 bs-24 bg-input rounded-lg border border-separator shadow-sm grid place-content-center'>
      <span className='text-sm font-medium'>{item.id}</span>
    </div>
  );
};

const StorybookStack = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([
    {
      id: 'col-0',
      items: [
        { id: 'banana', column: 0, row: 0 },
        { id: 'pickle', column: 0, row: 1 },
        { id: 'wombat', column: 0, row: 2 },
        { id: 'kazoo', column: 0, row: 3 },
      ],
    },
    {
      id: 'col-1',
      items: [
        { id: 'noodle', column: 1, row: 0 },
        { id: 'squish', column: 1, row: 1 },
        { id: 'wobble', column: 1, row: 2 },
        { id: 'floof', column: 1, row: 3 },
      ],
    },
    {
      id: 'col-2',
      items: [
        { id: 'snorkel', column: 2, row: 0 },
        { id: 'bloop', column: 2, row: 1 },
        { id: 'wiggle', column: 2, row: 2 },
        { id: 'zoop', column: 2, row: 3 },
      ],
    },
  ]);

  const reorderItem = useCallback((itemId: string, targetId: string, closestEdge: Edge | null) => {
    setColumns((prevColumns) => {
      // Check if we're reordering columns
      const sourceColumnIndex = prevColumns.findIndex((col) => col.id === itemId);
      const targetColumnIndex = prevColumns.findIndex((col) => col.id === targetId);

      if (sourceColumnIndex !== -1 && targetColumnIndex !== -1) {
        // Reordering columns
        const newColumns = [...prevColumns];
        const [movedColumn] = newColumns.splice(sourceColumnIndex, 1);
        const insertIndex = closestEdge === 'right' ? targetColumnIndex + 1 : targetColumnIndex;
        newColumns.splice(insertIndex, 0, movedColumn);
        return newColumns;
      } else {
        // Reordering items within a column
        return prevColumns.map((column) => {
          const sourceIndex = column.items.findIndex((item) => item.id === itemId);
          const targetIndex = column.items.findIndex((item) => item.id === targetId);

          if (sourceIndex !== -1 && targetIndex !== -1) {
            const newItems = [...column.items];
            const [movedItem] = newItems.splice(sourceIndex, 1);
            const insertIndex = closestEdge === 'bottom' ? targetIndex + 1 : targetIndex;
            newItems.splice(insertIndex, 0, movedItem);
            return { ...column, items: newItems };
          }
          return column;
        });
      }
    });
  }, []);

  return (
    <Stack orientation={'horizontal'} classNames='gap-1'>
      {columns.map((column) => (
        <StackItem
          key={column.id}
          id={column.id}
          orientation={'horizontal'}
          container={'board'}
          classNames='p-4 bg-deck rounded-md'
          onReorder={reorderItem}
        >
          <Stack orientation={'vertical'} classNames='gap-1'>
            {column.items.map((item) => (
              <StackItem
                key={item.id}
                id={item.id}
                orientation={'vertical'}
                container={column.id}
                onReorder={reorderItem}
              >
                <KanbanBlock item={item} />
              </StackItem>
            ))}
          </Stack>
        </StackItem>
      ))}
    </Stack>
  );
};

const meta: Meta<typeof StorybookStack> = {
  title: 'react-ui-stack-next/Stack',
  component: StorybookStack,
  decorators: [withTheme],
  argTypes: { orientation: { control: 'radio', options: ['horizontal', 'vertical'] } },
};

export default meta;

type Story = StoryObj<typeof StorybookStack>;

export const Default: Story = {
  args: { orientation: 'horizontal' },
};
