//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import { select } from 'd3';
import React, { type FC, useEffect, useMemo, useRef } from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Pulsar } from './pulsar';
import { SVG } from '../components';
import { useGrid, useZoom } from '../hooks';
import { type D3Callable } from '../util';

import '../../styles/graph.css';

const DefaultStory = (props: any) => {
  return (
    <SVG.Root>
      <StoryComponent {...props} />
    </SVG.Root>
  );
};

type Datum = {
  x: number;
  y: number;
  r: number;
};

const StoryComponent: FC<{ count: number }> = ({ count = 1 }) => {
  const items = useMemo<Datum[]>(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        r: 8,
      })),
    [count],
  );

  const grid = useGrid({ axis: true, grid: false });
  const zoom = useZoom();

  const root = useRef<SVGGElement>();
  useEffect(() => {
    select(root.current)
      .selectAll('g')
      .data(items)
      .join((enter) =>
        enter
          .append('g')
          .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
          .call(createNode),
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

const createNode: D3Callable<SVGGElement, Datum> = (group, classNames = 'stroke-blue-500 hover:fill-blue-500') => {
  group
    .append('circle')
    .classed(classNames, true)
    .attr('r', (d) => d.r)
    .on('click', function () {
      const d = select<SVGCircleElement, Datum>(this).datum();
      const group = select<SVGGElement, Datum>(this.parentElement as unknown as SVGGElement);
      group.call(Pulsar.has(group) ? Pulsar.create : Pulsar.remove, d.r);
    });
};

const meta: Meta = {
  title: 'ui/react-ui-graph/fx',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

export const Pulse = {
  args: {
    count: 20,
  },
};
