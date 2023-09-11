//
// Copyright 2023 DXOS.org
//

import { DndContext, MouseSensor, useSensor } from '@dnd-kit/core';
import { faker } from '@faker-js/faker';
import React, { FC, PropsWithChildren } from 'react';

import { chromeSurface, groupSurface, mx } from '@dxos/aurora-theme';

import '@dxosTheme';

import { Column, Columns } from './Container';
import { TypeCard } from './Custom';
import { DraggableCard } from './DraggableCard';
import { generators } from './testing';

faker.seed(1);

// TODO(burdon): Extract dnd from plugin-dnd to aurora-dnd.
//  - DragOverlay
//  - Unify file drag-and-drop (e.g., for IPFS).
// TODO(burdon): ScrollArea bugs.
// TODO(burdon): Containers (optional dragging):
//  - Column: Currently doesn't scroll inside Columns.
//  - Columns: Able to drag cards between columns; Able to drag columns to re-order.
//  - Grid: (e.g., kai notes).
//  - List: Simplified table (no custom columns).
//  - Panel layers.
// TODO(burdon): Editable cards.
// TODO(burdon): Plugins:
//  - Stack
//  - Kanban
//  - Thread
//  - Search
//  - Grid

const DnDContainer: FC<PropsWithChildren> = ({ children }) => {
  const sensors = useSensor(MouseSensor, {});
  const handleDragStart = (event: any) => {
    // console.log('start', event);
  };
  const handleDragOver = (event: any) => {
    // console.log('over', event);
  };
  const handleDragCancel = (event: any) => {
    // console.log('cancel', event);
  };
  const handleDragEnd = (event: any) => {
    // console.log('end', event);
  };

  return (
    <DndContext
      sensors={[sensors]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
};

const ContainerStory = () => {
  return (
    <DnDContainer>
      <Columns id={'main'} classNames={'p-3'}>
        <Column id={'a'} classNames={[groupSurface, 'w-[360px] shadow rounded-md p-3 gap-2']}>
          <DraggableCard {...generators.document()} />
          <DraggableCard {...generators.document()} />
          <DraggableCard {...generators.image()} />
          <DraggableCard {...generators.document()} />
          <DraggableCard {...generators.document()} />
          <DraggableCard {...generators.image()} />
          <DraggableCard {...generators.document()} />
          <DraggableCard {...generators.document()} />
          <DraggableCard {...generators.document()} />
        </Column>
        <Column id={'b'} classNames={[groupSurface, 'w-[360px] shadow rounded-md p-3 gap-2']}>
          <DraggableCard {...generators.document()} />
          <DraggableCard {...generators.image()} />
          <DraggableCard {...generators.contact()} />
          <DraggableCard {...generators.message()} />
          <DraggableCard {...generators.project()} />
        </Column>
        <Column id={'c'} classNames={[groupSurface, 'w-[360px] shadow rounded-md p-3 gap-2']}>
          <TypeCard {...generators.document()} />
          <TypeCard {...generators.message()} />
          <TypeCard {...generators.message()} />
          <TypeCard {...generators.message()} />
          <TypeCard {...generators.message()} />
          <TypeCard {...generators.message()} />
        </Column>
      </Columns>
    </DnDContainer>
  );
};

export default {
  component: ContainerStory,
  args: {},
  decorators: [
    (Story: any) => (
      <div className={mx('flex h-screen w-full overflow-hidden', chromeSurface)}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
