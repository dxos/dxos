//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Canvas } from './Canvas';
import { useProjection, useWheel } from '../../hooks';
import { type Point } from '../../types';
import { testId } from '../../util';
import { Grid, type GridProps } from '../Grid';

const Render = (props: GridProps) => {
  return (
    <Canvas>
      <Content {...props} />
    </Canvas>
  );
};

const Content = (props: GridProps) => {
  const { scale, offset, styles } = useProjection();

  useWheel();

  return (
    <>
      <Grid scale={scale} offset={offset} {...props} />
      <div className='absolute' style={styles}>
        <Item x={0} y={-128} />
        <Item x={-128} y={128} />
        <Item x={128} y={128} />
      </div>
    </>
  );
};

const Item = ({ x, y }: Point) => {
  const size = 128;
  const pos = {
    left: x - size / 2,
    top: y - size / 2,
    width: size,
    height: size,
  };

  return (
    <div {...testId('dx-test', true)}>
      <div className='absolute flex border border-red-500 justify-center items-center' style={pos}>
        <div className='font-mono'>
          ({x},{y})
        </div>
      </div>
      {/* NOTE: Width and height are not important since overflow-visible. */}
      <svg className='absolute overflow-visible' style={pos}>
        <circle cx={64} cy={64} r={64} className='stroke-red-500 storke-width-2 fill-none' />
      </svg>
    </div>
  );
};

const meta: Meta<GridProps> = {
  title: 'ui/react-ui-canvas/Canvas',
  component: Grid,
  render: Render,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<GridProps>;

export const Default: Story = {
  args: {
    id: 'test',
    size: 16,
  },
};
