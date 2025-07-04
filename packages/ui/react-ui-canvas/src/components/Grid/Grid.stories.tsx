//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { GridComponent, type GridProps } from './Grid';
import { type ProjectionState } from '../../hooks';

const DefaultStory = (props: GridProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ scale, offset }] = useState<ProjectionState>({ scale: 1, offset: { x: 0, y: 0 } });

  return (
    <div ref={ref} className='grow'>
      <GridComponent scale={scale} offset={offset} {...props} />
    </div>
  );
};

const meta: Meta<GridProps> = {
  title: 'ui/react-ui-canvas/Grid',
  component: GridComponent,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<GridProps>;

export const Default: Story = {
  args: {
    size: 16,
  },
};
