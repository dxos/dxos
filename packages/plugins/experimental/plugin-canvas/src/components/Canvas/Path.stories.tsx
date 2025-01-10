//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import { type D3DragEvent } from 'd3';
import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';

import { GraphModel } from '@dxos/graph';
import { Canvas, Grid, useProjection, useWheel } from '@dxos/react-ui-canvas';
import { withLayout, withTheme } from '@dxos/storybook-utils';

const Render = () => {
  return (
    <Canvas>
      <Grid id={'test'} showAxes />
      <Content />
    </Canvas>
  );
};

const numNodes = 10;
const linkLength = 1;
const linkStrength = 0.4;
const gravity = 0.9;

const Content = () => {
  const { styles } = useProjection();
  useWheel({ zoom: false });

  const graph = useMemo(() => {
    const graph = new GraphModel();
    let source = { id: 0 };
    Object.assign(source, { fx: 0, fy: 0 });
    graph.addNode(source);
    Array.from({ length: numNodes - 1 }).forEach((_, i) => {
      const target = { id: i + 1, x: i * linkLength, y: 0, vx: 0, vy: 0 };
      graph.addNode(target);
      graph.addEdge({ id: `${source.id}-${target.id}`, source: source.id, target: target.id });
      source = target;
    });

    return graph;
  }, []);

  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const path = d3.select(svg.current).append('path').attr('class', 'fill-none stroke-primary-500');
    const nodes = d3
      .select(svg.current)
      .selectAll('circle')
      .data(graph.nodes)
      .enter()
      .append('circle')
      .attr('class', (_, i) => (i === 0 || i === numNodes - 1 ? 'fill-primary-800' : 'fill-primary-500'))
      .attr('r', (_, i) => (i === 0 || i === numNodes - 1 ? 8 : 4))
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y)
      .call(
        d3
          .drag<SVGCircleElement, any>()
          .on('start', ((event: D3DragEvent<SVGCircleElement, any, any>) => {
            if (!event.active) {
              simulation.alphaTarget(0.3).restart();
            }
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          }) as any)
          .on('drag', (event) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          })
          .on('end', (event) => {
            if (!event.active) {
              simulation.alphaTarget(0);
            }
            if (!event.sourceEvent.shiftKey) {
              event.subject.fx = null;
              event.subject.fy = null;
            }
          }),
      );

    const simulation = d3
      .forceSimulation(graph.nodes)
      .force(
        'link',
        d3
          .forceLink(graph.edges)
          .distance(linkLength)
          .strength(linkStrength)
          .id((d: any) => d.id),
      )
      .force('gravity', (alpha) => {
        graph.nodes.forEach((node) => {
          if (!node.fx) {
            node.vy += gravity * alpha;
            node.y += node.vy;
          }
        });
      })
      .velocityDecay(0.05) // Lower decay for more elastic movement.
      .alphaMin(0.001)
      .alphaDecay(0.001) // Slower decay for longer-lasting movement.
      .on('tick', () => {
        nodes.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
        path.attr(
          'd',
          graph.nodes.map((node, i) => (i === 0 ? `M ${node.x},${node.y}` : `L ${node.x},${node.y}`)).join(' '),
        );
      });

    return () => {
      simulation.stop();
      d3.select(svg.current).selectAll('*').remove();
    };
  }, [graph]);

  return <svg ref={svg} style={styles} className='w-full h-full overflow-visible' />;
};

const meta: Meta = {
  title: 'plugins/plugin-canvas/Path',
  render: Render,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
