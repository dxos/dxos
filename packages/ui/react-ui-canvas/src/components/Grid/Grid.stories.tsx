//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { type ProjectionState } from '../../hooks';

import { GridComponent, type GridProps } from './Grid';

const DefaultStory = (props: GridProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ scale, offset }] = useState<ProjectionState>({ scale: 1, offset: { x: 0, y: 0 } });

  return (
    <div role='none' ref={ref} className='grow'>
      <GridComponent scale={scale} offset={offset} {...props} />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-canvas/Grid',
  component: GridComponent,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof GridComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 16,
  },
};
