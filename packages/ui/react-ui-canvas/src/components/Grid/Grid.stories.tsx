//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { useRef, useState } from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Grid, type GridProps } from './Grid';
import { type ProjectionState } from '../../hooks';
import { useWheel } from '../../hooks';

const Render = (props: GridProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ scale, offset }, setProjection] = useState<ProjectionState>({ scale: 1, offset: { x: 0, y: 0 } });
  useWheel(ref.current, setProjection);

  return (
    <div ref={ref} className='grow'>
      <Grid scale={scale} offset={offset} {...props} />
    </div>
  );
};

const meta: Meta<GridProps> = {
  title: 'ui/react-ui-canvas/Grid',
  component: Grid,
  render: Render,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<GridProps>;

export const Default: Story = {
  args: {
    size: 16,
  },
};
