//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { useRef } from 'react';

import { Canvas, Grid, useProjection, useWheel } from '@dxos/react-ui-canvas';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { useRope } from '../../hooks';

const Render = () => {
  return (
    <Canvas>
      <Grid id={'test'} showAxes />
      <Rope />
    </Canvas>
  );
};

const Rope = () => {
  const { styles } = useProjection();
  useWheel({ zoom: false });
  const g = useRef<SVGGElement>(null);
  useRope(g.current, { x: 0, y: 0 }, { x: 256, y: 0 }, { nodes: 16 });

  return (
    <svg style={styles} className='w-full h-full overflow-visible'>
      <g ref={g} />
    </svg>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-canvas/Path',
  render: Render,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
