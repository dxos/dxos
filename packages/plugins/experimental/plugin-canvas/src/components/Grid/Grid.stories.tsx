//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Grid, type GridProps } from './Grid';
import type { TransformState } from '../../hooks';
import { useWheel } from '../../hooks';

// TODO(burdon): Factor out transform class, etc. (check reactivity).

const Render = (props: GridProps) => {
  const { ref, width = 0, height = 0 } = useResizeDetector();
  const [{ scale, offset }, setTransform] = useState<TransformState>({ scale: 1, offset: { x: 0, y: 0 } });
  useWheel(ref.current, width, height, setTransform);

  return (
    <div ref={ref} className='grow'>
      <Grid scale={scale} offset={offset} {...props} />
    </div>
  );
};

const meta: Meta<GridProps> = {
  title: 'plugins/plugin-canvas/Grid',
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
