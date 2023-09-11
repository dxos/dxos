//
// Copyright 2023 DXOS.org
//

import { DndContext, MouseSensor, useSensor } from '@dnd-kit/core';
import { faker } from '@faker-js/faker';
import React, { FC, PropsWithChildren } from 'react';

import { chromeSurface, groupSurface, mx } from '@dxos/aurora-theme';

import '@dxosTheme';

import { Column } from './Column';
import { Columns } from './Columns';
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

const columnStyle = [groupSurface, 'w-[360px] shadow rounded-md'];

const ContainerStory = () => {
  return (
    <DnDContainer>
      <Columns id={'main'} classNames={'p-3'}>
        <Column.Root classNames={columnStyle}>
          <Column.Header classNames={'bg-neutral-200'}>{faker.lorem.sentence()}</Column.Header>
          <Column.ViewPort id={'c-1'}>
            <DraggableCard {...generators.document()} />
            <DraggableCard {...generators.document()} />
            <DraggableCard {...generators.image()} />
            <DraggableCard {...generators.document()} />
            <DraggableCard {...generators.image()} />
            <DraggableCard {...generators.document()} />
            <DraggableCard {...generators.document()} />
            <DraggableCard {...generators.document()} />
            <DraggableCard {...generators.document()} />
          </Column.ViewPort>
          <Column.Footer classNames={'bg-neutral-200'}>{faker.lorem.sentence()}</Column.Footer>
        </Column.Root>
        <Column.Root classNames={columnStyle}>
          <Column.Header classNames={'bg-neutral-200'}>{faker.lorem.sentence()}</Column.Header>
          <Column.ViewPort id={'c-2'}>
            <DraggableCard {...generators.document()} />
            <DraggableCard {...generators.contact()} />
            <DraggableCard {...generators.image()} />
            <DraggableCard {...generators.message()} />
            <DraggableCard {...generators.message()} />
            <DraggableCard {...generators.project()} />
            <DraggableCard {...generators.project()} />
          </Column.ViewPort>
        </Column.Root>
        <Column.Root classNames={columnStyle}>
          <Column.Header classNames={'bg-neutral-200'}>{faker.lorem.sentence()}</Column.Header>
          <Column.ViewPort id={'c-3'}>
            <TypeCard {...generators.image()} {...{ body: undefined }} sqaure />
            <TypeCard {...generators.message()} />
            <TypeCard {...generators.message()} />
            <TypeCard {...generators.message()} />
            <TypeCard {...generators.message()} />
          </Column.ViewPort>
        </Column.Root>
        <Column.Root classNames={columnStyle}>
          <Column.Header classNames={'bg-neutral-200'}>{faker.lorem.sentence()}</Column.Header>
          <Column.ViewPort id={'c-4'}>
            <DraggableCard {...generators.document()} />
          </Column.ViewPort>
        </Column.Root>
        <Column.Root classNames={columnStyle}>
          <Column.Header classNames={'bg-neutral-200'}>{faker.lorem.sentence()}</Column.Header>
          <Column.ViewPort id={'c-5'} />
        </Column.Root>
        <Column.Root classNames={columnStyle}>
          <Column.Header classNames={'bg-neutral-200'}>{faker.lorem.sentence()}</Column.Header>
          <Column.ViewPort id={'c-6'} />
        </Column.Root>
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
