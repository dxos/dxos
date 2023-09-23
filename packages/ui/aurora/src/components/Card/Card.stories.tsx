//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React from 'react';

// TODO(burdon): Theme.
import { chromeSurface, groupSurface, mx } from '@dxos/aurora-theme';

import '@dxosTheme';

import { DraggableCard } from './DraggableCard';
import { generators } from './testing';
import { ScrollArea } from '../ScrollArea';

faker.seed(1);

const CardStory = () => {
  return (
    <ScrollArea.Root classNames={[groupSurface, 'p-4']}>
      <ScrollArea.Viewport>
        <div className='flex flex-col w-[400px] gap-2'>
          <DraggableCard {...generators.document()} />
          <DraggableCard {...generators.image()} />
          <DraggableCard {...generators.contact()} />
          <DraggableCard {...generators.message()} />
          <DraggableCard {...generators.project()} />
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='vertical'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};

export default {
  component: CardStory,
  args: {},
  decorators: [
    (Story: any) => (
      <div className={mx('flex h-screen w-full justify-center overflow-hidden', chromeSurface)}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
