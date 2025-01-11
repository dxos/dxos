//
// Copyright 2024 DXOS.org
//

import { type D3DragEvent } from 'd3';
import * as d3 from 'd3';
import { useEffect, useMemo, useState } from 'react';

import { GraphModel, type GraphNode } from '@dxos/graph';
import { type Point } from '@dxos/react-ui-canvas';

import { pointAdd, pointDivide, pointSubtract } from '../layout';

// export type RopeProps = {
//   start: Point;
//   end: Point;
//   options?: Partial<RopeOptions>;
// };

export type Rope = {
  id: string;
  start: Point;
  end?: Point;
};

export type RopeOptions = {
  nodes: number;
  linkLength: number;
  linkStrength: number;
  gravity: number;
};

export const defaultOptions: RopeOptions = {
  nodes: 11,
  linkLength: 16,
  linkStrength: 0.5,
  gravity: 0.8,
};

const endSize = 8;
const midSize = 3;

export type RopeResult = {
  simulation: d3.Simulation<any, any>;
};

export const useRope = (
  g: SVGGElement | null,
  elements: Rope[],
  _options: Partial<RopeOptions> = defaultOptions,
): RopeResult | undefined => {
  const options = useMemo(() => ({ ...defaultOptions, ..._options }), [_options]);

  // TODO(burdon): Add/delete elements.
  const graph = useMemo(() => {
    const graph = new GraphModel();
    for (const { id, start, end } of elements) {
      createGraph(graph, id, start, end, options);
    }

    return graph;
  }, [elements]);

  const [result, setResult] = useState<RopeResult | undefined>();
  useEffect(() => {
    if (!g) {
      return;
    }

    const group = d3.select(g);

    const paths = group
      .selectAll('path')
      .data(elements)
      .enter()
      .append('path')
      .attr('class', 'fill-none stroke-primary-500');

    const nodes = group
      .selectAll('circle')
      .data(graph.nodes)
      .enter()
      .append('circle')
      .attr('class', (d) =>
        d.type === 'start' || d.type === 'end'
          ? 'stroke-[4px] stroke-primary-500 fill-primary-800'
          : 'fill-primary-500',
      )
      .attr('r', (d) => (d.type === 'start' || d.type === 'end' ? endSize : midSize))
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y);

    const simulation = createSimulation(graph, options).on('tick', () => {
      nodes.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
      paths.attr('d', ({ id }) => {
        const root = graph.getNode(`${id}-0`);
        const nodes = graph.traverse(root);
        return nodes.map((node, i) => (i === 0 ? `M ${node.x},${node.y}` : `L ${node.x},${node.y}`)).join(' ');
      });
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
  }, [g, graph, elements]);

  return result;
};

/**
 * Create force simulation.
 */
export const createSimulation = (graph: GraphModel, options: RopeOptions) =>
  d3
    // NOTE: THe simulation updates the nodes.
    .forceSimulation(graph.nodes)
    .force(
      'link',
      d3
        // Copy edges since the source/target ids are converted to objects by the simulation.
        .forceLink(graph.edges.map((edge) => ({ ...edge })))
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

/**
 * Create subgraph for spring.
 */
const createGraph = (
  graph: GraphModel,
  id: string,
  p1: Point,
  p2: Point | undefined,
  options: RopeOptions,
): GraphNode => {
  const d = p2 && options.nodes > 1 ? pointDivide(pointSubtract(p2, p1), options.nodes - 1) : { x: 0, y: -1 };

  let source: GraphNode = { id: `${id}-0`, type: 'start' };
  Object.assign(source, { ...p1, fx: p1.x, fy: p1.y });
  graph.addNode(source);

  Array.from({ length: options.nodes - 1 }).forEach((_, i) => {
    const p = pointAdd(source as any as Point, d);
    const target = { id: `${id}-${i + 1}`, ...p, vx: 0, vy: 0 };
    graph.addNode(target);
    graph.addEdge({ id: `${source.id}_${target.id}`, source: source.id, target: target.id });
    source = target;
  });

  Object.assign(source, { type: 'end' }, p2 && { fx: p2.x, fy: p2.y });
  return source;
};
