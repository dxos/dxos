//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { select } from 'd3';
import React, { type FC, useEffect, useMemo, useRef } from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { SVG } from '../components';
import { useGrid, useZoom } from '../hooks';
import { type D3Callable } from '../util';

import { Pulsar } from './pulsar';

import '../../styles/graph.css';

type Datum = {
  x: number;
  y: number;
  r: number;
};

type StoryProps = {
  count: number;
} & Pulsar.Options;

const DefaultStory = (props: StoryProps) => (
  <SVG.Root>
    <StoryComponent {...props} />
  </SVG.Root>
);

const StoryComponent: FC<StoryProps> = ({ count = 1, ...options }) => {
  const items = useMemo<Datum[]>(
    () =>
      Array.from({ length: count }, () => {
        const a = Math.random() * Math.PI * 2;
        const r = 100 + Math.random() * 200;
        return {
          x: r * Math.cos(a),
          y: r * Math.sin(a),
          r: Math.floor(Math.random() * 10) + 4,
        };
      }),
    [count],
  );

  const grid = useGrid({ axis: true, grid: false });
  const zoom = useZoom();

  const root = useRef<SVGGElement>(null);
  useEffect(() => {
    select(root.current)
      .selectAll('g')
      .data(items)
      .join((enter) =>
        enter
          .append('g')
          .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
          .call(createNode, 'stroke-blue-500 hover:fill-blue-500', options),
      );
  }, [items]);

  return (
    <>
      <g ref={grid.ref} className='dx-grid' />
      <g ref={zoom.ref}>
        <g ref={root} className='dx-graph' />
      </g>
    </>
  );
};

const createNode: D3Callable<SVGGElement, Datum> = (group, classNames, options) => {
  group
    .append('circle')
    .classed(classNames, true)
    .attr('r', (d) => d.r)
    .on('click', function () {
      const d = select<SVGCircleElement, Datum>(this).datum();
      const group = select<SVGGElement, Datum>(this.parentElement as unknown as SVGGElement);
      if (Pulsar.has(group)) {
        Pulsar.create(group, d.r, options);
      } else {
        Pulsar.remove(group);
      }
    });
};

const meta = {
  title: 'ui/react-ui-graph/fx',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultPulse: Story = {
  args: {
    count: 20,
  },
};

export const RapidPulse: Story = {
  args: {
    count: 20,
    duration: 1_000,
    period: 1_000,
    ratio: 5,
  },
};
