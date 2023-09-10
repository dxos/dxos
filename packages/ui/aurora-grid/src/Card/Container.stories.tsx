//
// Copyright 2023 DXOS.org
//

import { DndContext, MouseSensor, useSensor } from '@dnd-kit/core';
import { faker } from '@faker-js/faker';
import React, { FC, PropsWithChildren } from 'react';

import '@dxosTheme';

import { Card, DraggableCard } from './Card';
import { Column } from './Container';
import { generators } from './testing';

faker.seed(5);

// TODO(burdon): Replace with plugin-dnd.
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

const Columns = () => {
  return (
    <div className='flex grow gap-8 overflow-hidden'>
      <Column id={'a'}>
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
      <Column id={'b'}>
        <DraggableCard {...generators.document()} />
        <DraggableCard {...generators.image()} />
        <DraggableCard {...generators.contact()} />
        <DraggableCard {...generators.message()} />
      </Column>
      <Column id={'c'}>
        <Card {...generators.document()} />
        <Card {...generators.message()} />
        <Card {...generators.message()} />
        <Card {...generators.message()} />
        <Card {...generators.message()} />
        <Card {...generators.message()} />
      </Column>
    </div>
  );
};

const ContainerStory = () => {
  return (
    <DnDContainer>
      <Columns />
    </DnDContainer>
  );
};

export default {
  component: ContainerStory,
  args: {},
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full overflow-hidden'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
