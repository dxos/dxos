//
// Copyright 2024 DXOS.org
//

import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { useCanvasContext, useWheel } from '../../hooks';
import { type Point } from '../../types';
import { testId } from '../../util';
import { Grid, type GridProps } from '../Grid';

import { Canvas } from './Canvas';

const size = 128;

const points: Point[] = [0, (2 * Math.PI) / 3, (2 * Math.PI * 2) / 3].map((a, i) => ({
  x: Math.round(Math.cos(a - Math.PI / 2) * size * 1.5),
  y: Math.round(Math.sin(a - Math.PI / 2) * size * 1.5),
}));

const DefaultStory = (props: GridProps) => {
  return (
    <Canvas>
      <Grid {...props} />
      <Content />
    </Canvas>
  );
};

const TwoCanvases = (props: GridProps) => {
  return (
    <div className='grid grid-cols-2 gap-2 w-full h-full'>
      <div className='h-full relative'>
        <Canvas>
          <Grid {...props} />
          <Content />
        </Canvas>
      </div>
      <div className='h-full relative'>
        <Canvas>
          <Grid {...props} />
          <Content />
        </Canvas>
      </div>
    </div>
  );
};

const Content = () => {
  useWheel();
  return (
    <div>
      {points.map(({ x, y }, i) => (
        <Item key={i} x={x} y={y} />
      ))}
    </div>
  );
};

const Item = (p: Point) => {
  const { projection } = useCanvasContext();
  const r = (projection.scale * size) / 2;
  const [{ x, y }] = projection.toScreen([p]);
  const rect = {
    left: x - size / 2,
    top: y - size / 2,
    width: size,
    height: size,
  };

  return (
    <div {...testId('dx-test', true)}>
      <div className='absolute flex justify-center items-center' style={rect}>
        <div className='font-mono'>
          ({p.x},{p.y})
        </div>
      </div>

      {/* NOTE: Width and height are not important since overflow-visible. */}
      <svg className='absolute overflow-visible'>
        <circle cx={x} cy={y} r={r} className='stroke-red-500 storke-width-2 fill-none' />
      </svg>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-canvas/Canvas',
  component: Grid,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { size: 16 },
};

export const SideBySide: Story = {
  args: { size: 16 },
  render: TwoCanvases,
};
