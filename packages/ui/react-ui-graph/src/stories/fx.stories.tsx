//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import { easeCubicOut, select } from 'd3';
import React, { type FC, useEffect, useMemo, useRef } from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { SVG } from '../components';
import { useGrid, useZoom } from '../hooks';
import { type D3Selection, type D3Callable } from '../util';

import '../../styles/graph.css';

const DefaultStory = (props: any) => {
  return (
    <SVG.Root>
      <StoryComponent {...props} />
    </SVG.Root>
  );
};

const StoryComponent: FC<{ count: number }> = ({ count = 1 }) => {
  const items = useMemo(
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

const createNode: D3Callable<SVGGElement> = (group, classNames = 'stroke-blue-500') => {
  group
    .append('circle')
    .classed(classNames, true)
    .attr('r', (d) => d.r)
    .on('click', function (d) {
      const parent = select(this.parentElement);
      if (parent.select('.dx-pulsar').empty()) {
        select(this).call(createPulsar);
      } else {
        parent.property('active', false);
      }
    });
};

const createPulsar: D3Callable<SVGGElement> = (node) => {
  const circle = select(node.node().closest('g'))
    .classed('dx-pulsar', true)
    .property('active', true)
    .append('circle')
    .classed('stroke-2 stroke-red-500 fill-none', true);

  startAnimation(circle, parseFloat(node.attr('r')));
};

const startAnimation = (
  circle: D3Selection<SVGCircleElement>,
  r: number,
  period = 1_000,
  duration = period,
  ratio = 3,
) => {
  const dt = period - (Date.now() % period);
  return circle
    .attr('r', r)
    .attr('opacity', 1)
    .transition('pulsar')
    .delay(dt)
    .duration(duration - 50)
    .ease(easeCubicOut)
    .attr('r', r * ratio)
    .attr('opacity', -0.1)
    .on('end', function () {
      if (select(this.parentElement).property('active')) {
        startAnimation(select(this), r);
      } else {
        select(this).remove();
      }
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
