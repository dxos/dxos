//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { ToggleContainer } from '../ToggleContainer';

import { NumericTabs } from './NumericTabs';

const content = Array.from({ length: 15 }, (_, i) => ({
  title: faker.lorem.paragraph(),
  content: faker.lorem.paragraphs(3),
}));

const meta = {
  title: 'ui/react-ui-components/NumericTabs',
  component: NumericTabs,
  decorators: [withTheme],
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
      <div className='flex flex-col w-[30rem] p-4 bg-attention'>
        <ToggleContainer.Root classNames='grid grid-cols-[32px_1fr]' open>
          <ToggleContainer.Header>{content[selected].title}</ToggleContainer.Header>
          <ToggleContainer.Content>
            <NumericTabs length={content.length} selected={selected} onSelect={setSelected} />
            <div className='flex-1 pis-2 pie-2 overflow-y-auto'>{content[selected].content}</div>
          </ToggleContainer.Content>
        </ToggleContainer.Root>
      </div>
    );
  },
};
