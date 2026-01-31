//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Scrollable } from './Scrollable';

const DefaultStory = ({ count }: { count: number }) => {
  return (
    <Scrollable axis='vertical'>
      <div role='list' className='flex flex-col pli-2 plb-1 gap-1'>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} role='listitem' className='pli-2 plb-1 border border-separator'>
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
