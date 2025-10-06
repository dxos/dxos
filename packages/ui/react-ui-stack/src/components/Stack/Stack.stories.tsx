//
// Copyright 2024 DXOS.org
//

import { type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/react-ui/testing';

import { type StackItemData } from '../defs';
import { StackItem } from '../StackItem';

import { Stack } from './Stack';

type StoryStackItem = {
  id: string;
  title: string;
  items?: StoryStackItem[];
};

const KanbanBlock = ({ item }: { item: StoryStackItem }) => {
  return (
    <div className='overflow-hidden'>
      <p className='place-content-center p-4'>{item.title}</p>
    </div>
  );
};

const DefaultStory = () => {
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
      <Stack orientation='horizontal' size='contain' onRearrange={reorderItem}>
        {columns.map((column, columnIndex, columnsArray) => (
          <StackItem.Root
            key={column.id}
            item={column}
            prevSiblingId={columnIndex > 0 ? columnsArray[columnIndex - 1].id : undefined}
            nextSiblingId={columnIndex < columnsArray.length - 1 ? columnsArray[columnIndex + 1].id : undefined}
          >
            <StackItem.Heading>
              <StackItem.ResizeHandle />
            </StackItem.Heading>
            <Stack orientation='vertical' size='contain'>
              {column.items?.map((card, cardIndex, cardsArray) => (
                <StackItem.Root
                  key={card.id}
                  item={card}
                  prevSiblingId={cardIndex > 0 ? cardsArray[cardIndex - 1].id : undefined}
                  nextSiblingId={cardIndex < cardsArray.length - 1 ? cardsArray[cardIndex + 1].id : undefined}
                >
                  <StackItem.Heading>
                    <StackItem.ResizeHandle />
                  </StackItem.Heading>
                  <KanbanBlock item={card} />
                </StackItem.Root>
              ))}
            </Stack>
          </StackItem.Root>
        ))}
      </Stack>
    </main>
  );
};

const meta = {
  title: 'ui/react-ui-stack/Stack',
  component: DefaultStory,
  argTypes: { orientation: { control: 'radio', options: ['horizontal', 'vertical'] } },
  decorators: [withTheme],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Default: Story = {
  args: {
    orientation: 'horizontal',
  },
};
