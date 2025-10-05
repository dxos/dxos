//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef } from 'react';

import { type SVGContext, useGrid, useZoom } from '../../hooks';

import { SVG } from './SVG';

import '../../../styles/graph.css';

type ComponentProps = {
  grid?: boolean;
  zoom?: boolean;
};

const Component = (options: ComponentProps) => {
  const grid = useGrid({ visible: options.grid, axis: true });
  const zoom = useZoom({ enabled: options.zoom });

  return (
    <>
      <g ref={grid.ref} className='dx-grid' />
      <g ref={zoom.ref} className='[&>circle]:stroke-red-500'>
        <circle cx={0} cy={0} r={128} />
      </g>
    </>
  );
};

const DefaultStory = (props: ComponentProps) => {
  const context = useRef<SVGContext>(null);

  return (
    <SVG.Root ref={context}>
      <Component {...props} />
    </SVG.Root>
  );
};

const meta = {
  title: 'ui/react-ui-graph/SVGRoot',
  render: DefaultStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    grid: true,
  },
};
