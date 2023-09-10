//
// Copyright 2023 DXOS.org
//

import { DndContext, MouseSensor, useSensor } from '@dnd-kit/core';
import { faker } from '@faker-js/faker';
import React, { FC, PropsWithChildren } from 'react';

import '@dxosTheme';

import { DraggableCard } from './Card';
import { Container } from './Container';
import { createCard } from './testing';

faker.seed(1);

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

const ContainerStory = () => {
  return (
    <DnDContainer>
      <div className='flex grow grid grid-cols-2 grid-flow-col gap-8 m-8 ring'>
        <Container id={'a'}>
          <DraggableCard {...createCard()} />
          <DraggableCard {...createCard()} />
        </Container>
        <Container id={'b'}>
          <DraggableCard {...createCard()} />
        </Container>
        <Container id={'c'}>
          <DraggableCard {...createCard()} />
        </Container>
      </div>
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
