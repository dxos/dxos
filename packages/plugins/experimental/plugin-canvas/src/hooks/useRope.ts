//
// Copyright 2024 DXOS.org
//

import { type D3DragEvent } from 'd3';
import * as d3 from 'd3';
import { useEffect, useMemo, useState } from 'react';

import { GraphModel } from '@dxos/graph';
import { type Point } from '@dxos/react-ui-canvas';

import { pointAdd, pointDivide, pointSubtract } from '../layout';

// export type RopeProps = {
//   start: Point;
//   end: Point;
//   options?: Partial<RopeOptions>;
// };

export type RopeOptions = {
  nodes: number;
  linkLength: number;
  linkStrength: number;
  gravity: number;
};

export const defaultOptions: RopeOptions = {
  nodes: 10,
  linkLength: 1,
  linkStrength: 0.5,
  gravity: 0.5,
};

// TODO(burdon): Options (incl. class).
const endSize = 8;
const midSize = 0;

export type RopeResult = {
  simulation: d3.Simulation<any, any>;
};

export const useRope = (
  g: SVGGElement | null,
  start: Point,
  end: Point,
  _options: Partial<RopeOptions> = defaultOptions,
): RopeResult | undefined => {
  const options = useMemo(() => ({ ...defaultOptions, ..._options }), [_options]);

  const graph = useMemo(() => {
    const d = options.nodes > 1 ? pointDivide(pointSubtract(end, start), options.nodes - 1) : { x: 0, y: -1 };

    const graph = new GraphModel();
    let source = { id: 0 };
    Object.assign(source, { ...start, fx: start.x, fy: start.y });
    graph.addNode(source);
    Array.from({ length: options.nodes - 1 }).forEach((_, i) => {
      const p = pointAdd(source as any as Point, d);
      const target = { id: i + 1, ...p, vx: 0, vy: 0 };
      graph.addNode(target);
      graph.addEdge({ id: `${source.id}-${target.id}`, source: source.id, target: target.id });
      source = target;
    });

    Object.assign(source, { fx: end.x, fy: end.y });
    return graph;
  }, []);

  const [result, setResult] = useState<RopeResult | undefined>();
  useEffect(() => {
    if (!g) {
      return;
    }

    const group = d3.select(g);
    const path = group.append('path').attr('class', 'fill-none stroke-primary-500');
    const nodes = group
      .selectAll('circle')
      .data(graph.nodes)
      .enter()
      .append('circle')
      .attr('class', (_, i) => (i === 0 || i === options.nodes - 1 ? 'fill-primary-800' : 'fill-primary-500'))
      .attr('r', (_, i) => (i === 0 || i === options.nodes - 1 ? endSize : midSize))
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y);

    const simulation = createSimulation(graph, options).on('tick', () => {
      nodes.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
      path.attr(
        'd',
        graph.nodes.map((node, i) => (i === 0 ? `M ${node.x},${node.y}` : `L ${node.x},${node.y}`)).join(' '),
      );
    });

    nodes.call(
      createDrag((ev) => {
        simulation.alphaTarget(ev === 'start' ? 0.3 : 0);
        if (ev === 'start') {
          simulation.restart();
        }
      }),
    );

    setResult({ simulation });
    return () => {
      setResult(undefined);
      simulation.stop();
      d3.select(g).selectAll('*').remove();
    };
  }, [g, graph]);

  return result;
};

/**
 * Create force simulation.
 */
export const createSimulation = (graph: GraphModel, options: RopeOptions) =>
  d3
    .forceSimulation(graph.nodes)
    .force(
      'link',
      d3
        .forceLink(graph.edges)
        .distance(options.linkLength)
        .strength(options.linkStrength)
        .id((d: any) => d.id),
    )
    .force('gravity', (alpha) => {
      graph.nodes.forEach((node) => {
        if (!node.fx) {
          node.vy += options.gravity * alpha;
          node.y += node.vy;
        }
      });
    })
    .velocityDecay(0.05) // Lower decay for more elastic movement.
    .alphaMin(0.001)
    .alphaDecay(0.001); // Slower decay for longer-lasting movement.

/**
 * Drag behavior.
 */
export const createDrag = (cb: (event: 'start' | 'stop') => void) =>
  d3
    .drag<SVGCircleElement, any>()
    .on('start', ((event: D3DragEvent<SVGCircleElement, any, any>) => {
      if (!event.active) {
        cb('start');
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
        cb('stop');
      }
      if (!event.sourceEvent.shiftKey) {
        event.subject.fx = null;
        event.subject.fy = null;
      }
    });
