//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { ScrollArea } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { ToggleContainer } from '../ToggleContainer';

import { NumericTabs } from './NumericTabs';

const content = Array.from({ length: 15 }, () => ({
  title: faker.lorem.paragraph(),
  content: faker.lorem.paragraphs(3),
}));

const meta = {
  title: 'ui/react-ui-components/NumericTabs',
  component: NumericTabs,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof NumericTabs>;

export default meta;

type Story = StoryObj<typeof NumericTabs>;

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState(0);
    return (
      <div className='flex flex-col w-[30rem] p-2 bg-attention rounded-lg'>
        <ToggleContainer.Root classNames='grid grid-rows-[max-content_1fr]' open>
          <ToggleContainer.Header>
            <div className='pl-2'>{content[selected].title}</div>
          </ToggleContainer.Header>
          <ToggleContainer.Content classNames='grid grid-cols-[max-content_1fr]'>
            <div className='px-1'>
              <NumericTabs length={content.length} selected={selected} onSelect={setSelected} />
            </div>
            <ScrollArea.Root orientation='vertical' thin padding>
              <ScrollArea.Viewport>{content[selected].content}</ScrollArea.Viewport>
            </ScrollArea.Root>
          </ToggleContainer.Content>
        </ToggleContainer.Root>
      </div>
    );
  },
};
