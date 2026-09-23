//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { GridComponent, type GridProps } from './Grid.tsx';

const DefaultStory = (props: GridProps) => (
  <div className='grow'>
    <GridComponent scale={1} offset={{ x: 0, y: 0 }} {...props} />
  </div>
);

const meta: Meta<GridProps> = {
  title: 'ui/react-ui-canvas/scene/Grid',
  component: GridComponent,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
};

export default meta;

type Story = StoryObj<GridProps>;

export const Default: Story = {
  args: { size: 16, showAxes: true },
};
