//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta } from '@storybook/react';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Canvas, type CanvasRootProps } from './Canvas';
import { createSnap, type Dimension } from './geometry';
import { createGraph } from './testing';

const Render = (props: CanvasRootProps) => (
  <Canvas.Root {...props}>
    <Canvas.Editor />
  </Canvas.Root>
);

const meta: Meta<CanvasRootProps> = {
  title: 'plugins/plugin-grid/Canvas',
  component: Canvas.Root,
  render: Render,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

const itemSize: Dimension = { width: 128, height: 64 };
const snapPoint = createSnap({ width: itemSize.width + 64, height: itemSize.height + 64 });

export const Default = {
  args: {
    graph: createGraph(itemSize, snapPoint),
  },
};
