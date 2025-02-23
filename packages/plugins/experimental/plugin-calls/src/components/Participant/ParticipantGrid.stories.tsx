//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { withTheme, withLayout } from '@dxos/storybook-utils';

type GridProps = {
  items: string[];
};

const Grid = ({ items }: GridProps) => {
  const { ref, width, height } = useResizeDetector();

  return (
    <div ref={ref} className='flex flex-col w-full h-full overflow-hidden border-2 border-red-500'>
      <div className='w-full aspect-video border-2 border-blue-500'>Fullscreen</div>
      <div className='flex grow border-2 border-green-500 overflow-x-auto'>
        {items.map((item, i) => (
          <div key={i} className='min-w-96 aspect-video border-2 border-yellow-500'>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

const meta: Meta<GridProps> = {
  title: 'plugins/plugin-calls/Grid',
  component: Grid,
  render: (args) => (
    <div className='w-full outline outline-red-500'>
      <Grid items={['1', '2', '3', '4', '5']} />
    </div>
  ),
  decorators: [
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
      classNames: 'justify-center',
    }),
  ],
};

export default meta;

type Story = StoryObj<GridProps>;

export const Default: Story = {};
