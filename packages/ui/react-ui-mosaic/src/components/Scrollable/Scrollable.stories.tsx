//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Scrollable } from './Scrollable';

const DefaultStory = ({ count }: { count: number }) => {
  return (
    <Scrollable>
      <div className='p-1 gap-1'>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className='border border-separator pli-2 plb-1'>
            {index}
          </div>
        ))}
      </div>
    </Scrollable>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-mosaic/Scrollable',
  component: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    count: 100,
  },
};
