//
// Copyright 2024 DXOS.org
//

import { type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { type Meta, type StoryObj } from '@storybook/react';
import React, { useState, useCallback } from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { Stack } from './Stack';
import { StackItem, type StackItemData, StackItemHeading } from './StackItem';

type StoryStackItem = {
  id: string;
  title: string;
  items?: StoryStackItem[];
};

const KanbanBlock = ({ item }: { item: StoryStackItem }) => {
  return <div className='bg-base place-content-center p-4'>{item.title}</div>;
};

const StorybookStack = () => {
  const [columns, setColumns] = useState<StoryStackItem[]>(
    faker.helpers.multiple(
      () =>
        ({
          id: faker.string.uuid(),
          title: faker.lorem.paragraph(),
          items: faker.helpers.multiple(
            () =>
              ({
                id: faker.string.uuid(),
                title: faker.lorem.paragraph(),
              }) satisfies StoryStackItem,
            { count: { min: 32, max: 64 } },
          ),
        }) satisfies StoryStackItem,
      { count: 8 },
    ),
  );

  const reorderItem = useCallback((source: StackItemData, target: StackItemData, closestEdge: Edge | null) => {
    setColumns((prevColumns) => {
      const newColumns = [...prevColumns];
      const sourceColumn = newColumns.find(
        (col) => col.id === source.id || col.items?.some((card) => card.id === source.id),
      );
      const targetColumn = newColumns.find(
        (col) => col.id === target.id || col.items?.some((card) => card.id === target.id),
      );

      if (sourceColumn && targetColumn) {
        if (source.type === 'column' && target.type === 'column') {
          // Reordering columns
          const sourceIndex = newColumns.findIndex((col) => col.id === source.id);
          const targetIndex = newColumns.findIndex((col) => col.id === target.id);
          const [movedColumn] = newColumns.splice(sourceIndex, 1);
          const insertIndex = closestEdge === 'right' ? targetIndex + 1 : targetIndex;
          newColumns.splice(insertIndex, 0, movedColumn);
        } else {
          // Reordering cards within a column
          const sourceCardIndex = sourceColumn.items?.findIndex((card) => card.id === source.id);
          const targetCardIndex = targetColumn.items?.findIndex((card) => card.id === target.id);
          if (
            typeof sourceCardIndex === 'number' &&
            typeof targetCardIndex === 'number' &&
            sourceColumn.items &&
            targetColumn.items
          ) {
            const [movedCard] = sourceColumn.items.splice(sourceCardIndex, 1);

            let insertIndex;
            if (sourceColumn === targetColumn && sourceCardIndex < targetCardIndex) {
              insertIndex = closestEdge === 'bottom' ? targetCardIndex : targetCardIndex - 1;
            } else {
              insertIndex = closestEdge === 'bottom' ? targetCardIndex + 1 : targetCardIndex;
            }
            targetColumn.items.splice(insertIndex, 0, movedCard);
          }
        }
      }

      return newColumns;
    });
  }, []);

  return (
    <main className='fixed inset-0'>
      <Stack orientation='horizontal' size='contain'>
        {columns.map((column) => (
          <StackItem key={column.id} item={column} onRearrange={reorderItem}>
            <StackItemHeading />
            <Stack orientation='vertical' size='contain'>
              {column.items?.map((card) => (
                <StackItem key={card.id} item={card} onRearrange={reorderItem}>
                  <StackItemHeading />
                  <KanbanBlock item={card} />
                </StackItem>
              ))}
            </Stack>
          </StackItem>
        ))}
      </Stack>
    </main>
  );
};

type Story = StoryObj<typeof StorybookStack>;

export const Default: Story = {
  args: {
    orientation: 'horizontal',
  },
};

const meta: Meta<typeof StorybookStack> = {
  title: 'ui/react-ui-stack-next/Stack',
  component: StorybookStack,
  decorators: [withTheme],
  argTypes: { orientation: { control: 'radio', options: ['horizontal', 'vertical'] } },
};

export default meta;
