//
// Copyright 2024 DXOS.org
//

import { type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { type Meta, type StoryObj } from '@storybook/react';
import React, { useState, useCallback } from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Stack } from './Stack';
import { StackItem } from './StackItem';

type CardItem = {
  id: string;
  type: 'card';
  content: string;
};

type ColumnItem = {
  id: string;
  type: 'column';
  title: string;
  cards: CardItem[];
};

const KanbanBlock = ({ item }: { item: CardItem }) => {
  return (
    <div className='is-64 bs-24 bg-input rounded-lg border border-separator shadow-sm grid place-content-center'>
      <span className='text-sm font-medium'>{item.content}</span>
    </div>
  );
};

const StorybookStack = () => {
  const [columns, setColumns] = useState<ColumnItem[]>([
    {
      id: 'col-0',
      type: 'column',
      title: 'To Do',
      cards: [
        { id: 'banana', type: 'card', content: 'Banana' },
        { id: 'pickle', type: 'card', content: 'Pickle' },
        { id: 'wombat', type: 'card', content: 'Wombat' },
        { id: 'kazoo', type: 'card', content: 'Kazoo' },
      ],
    },
    {
      id: 'col-1',
      type: 'column',
      title: 'In Progress',
      cards: [
        { id: 'noodle', type: 'card', content: 'Noodle' },
        { id: 'squish', type: 'card', content: 'Squish' },
        { id: 'wobble', type: 'card', content: 'Wobble' },
        { id: 'floof', type: 'card', content: 'Floof' },
      ],
    },
    {
      id: 'col-2',
      type: 'column',
      title: 'Done',
      cards: [
        { id: 'snorkel', type: 'card', content: 'Snorkel' },
        { id: 'bloop', type: 'card', content: 'Bloop' },
        { id: 'wiggle', type: 'card', content: 'Wiggle' },
        { id: 'zoop', type: 'card', content: 'Zoop' },
      ],
    },
  ]);

  const reorderItem = useCallback((sourceId: string, targetId: string, closestEdge: Edge | null) => {
    setColumns((prevColumns) => {
      const newColumns = [...prevColumns];
      const sourceColumn = newColumns.find(
        (col) => col.id === sourceId || col.cards.some((card) => card.id === sourceId),
      );
      const targetColumn = newColumns.find(
        (col) => col.id === targetId || col.cards.some((card) => card.id === targetId),
      );

      if (sourceColumn && targetColumn) {
        if (sourceId.startsWith('col-') && targetId.startsWith('col-')) {
          // Reordering columns
          const sourceIndex = newColumns.findIndex((col) => col.id === sourceId);
          const targetIndex = newColumns.findIndex((col) => col.id === targetId);
          const [movedColumn] = newColumns.splice(sourceIndex, 1);
          const insertIndex = closestEdge === 'right' ? targetIndex + 1 : targetIndex;
          newColumns.splice(insertIndex, 0, movedColumn);
        } else {
          // Reordering cards within a column
          const sourceCardIndex = sourceColumn.cards.findIndex((card) => card.id === sourceId);
          const targetCardIndex = targetColumn.cards.findIndex((card) => card.id === targetId);
          const [movedCard] = sourceColumn.cards.splice(sourceCardIndex, 1);

          let insertIndex;
          if (sourceColumn === targetColumn && sourceCardIndex < targetCardIndex) {
            insertIndex = closestEdge === 'bottom' ? targetCardIndex : targetCardIndex - 1;
          } else {
            insertIndex = closestEdge === 'bottom' ? targetCardIndex + 1 : targetCardIndex;
          }
          targetColumn.cards.splice(insertIndex, 0, movedCard);
        }
      }

      return newColumns;
    });
  }, []);

  return (
    <Stack orientation={'horizontal'} classNames='gap-1'>
      {columns.map((column) => (
        <StackItem
          key={column.id}
          item={column}
          orientation={'horizontal'}
          classNames='p-4 bg-deck rounded-md'
          onReorder={reorderItem}
        >
          <Stack orientation={'vertical'} classNames='gap-1'>
            {column.cards.map((card) => (
              <StackItem key={card.id} item={card} orientation={'vertical'} onReorder={reorderItem}>
                <KanbanBlock item={card} />
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
