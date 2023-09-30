//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { faker } from '@faker-js/faker';
import React, { FC, PropsWithChildren, useState } from 'react';

import { Card } from '@dxos/aurora';

import { Stack, StackItem } from './Stack';
import { createItem, FullscreenDecorator, SimpleCard, SimpleCardProps, TestItem } from '../testing';

faker.seed(3);

const testItems = Array.from({ length: 5 }).map(() => createItem(['document', 'image']));

export default {
  component: Card,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default: FC<PropsWithChildren> = ({ children }) => {
  const [items, setItems] = useState<StackItem<SimpleCardProps>[]>(() =>
    testItems.map((item) => ({ id: item.id, data: item, Component: SimpleCard })),
  );

  const handleDelete = (id: string) => {
    setItems((cards) => cards.filter((card) => card.id !== id));
  };

  const [activeItem, setActiveItem] = useState<TestItem>();
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(undefined);
    const { active, over } = event;
    if (active.id !== over?.id) {
      setItems((cards) => {
        const oldIndex = cards.findIndex((card) => card.id === active.id);
        const newIndex = cards.findIndex((card) => card.id === over?.id);
        return arrayMove(cards, oldIndex, newIndex);
      });
    }
  };

  // TODO(burdon): Select/delete.
  return (
    <DndContext
      onDragEnd={handleDragEnd}
      onDragStart={(event) => setActiveItem(event.active.data.current as TestItem)}
      onDragCancel={(event) => setActiveItem(undefined)}
    >
      <div className='flex w-[300px] overflow-hidden'>
        <Stack.Root items={items} />
      </div>

      <DragOverlay>{activeItem && <SimpleCard id={activeItem.id} data={activeItem} />}</DragOverlay>
    </DndContext>
  );
};
