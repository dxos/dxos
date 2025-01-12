//
// Copyright 2024 DXOS.org
//

import { type D3DragEvent, type SimulationNodeDatum } from 'd3';
import * as d3 from 'd3';
import { useEffect, useMemo, useState } from 'react';

import { GraphModel, type GraphNode } from '@dxos/graph';
import { type Point } from '@dxos/react-ui-canvas';
import { range } from '@dxos/util';

import { pointAdd, pointDivide, pointSubtract } from '../layout';

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
  alphaTarget: number;
};

export const defaultOptions: RopeOptions = {
  nodes: 11,
  linkLength: 16,
  linkStrength: 0.5,
  gravity: 0.9,
  alphaTarget: 0.3,
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
    const graph = new GraphModel<GraphNode<SimulationNodeDatum>>();
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

    const simulation = createSimulation(graph, options).on('tick', () => {
      nodes.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
      paths.attr('d', ({ id }) => {
        const find = (id: string) => simulation.nodes().find((d: any) => d.id === id)!;
        const root = graph.getNode(`${id}-0`)!;
        return graph
          .traverse(root)
          .map(({ id }, i) => {
            const node = find(id);
            return i === 0 ? `M ${node.x},${node.y}` : `L ${node.x},${node.y}`;
          })
          .join(' ');
      });
    });

    const nodes = group
      .selectAll('circle')
      .data(simulation.nodes())
      .enter()
      .append('circle')
      .attr('class', (d) =>
        d.data.type === 'start' || d.data.type === 'end'
          ? 'stroke-[4px] stroke-primary-500 fill-primary-800'
          : 'fill-primary-500',
      )
      .attr('r', (d) => (d.data.type === 'start' || d.data.type === 'end' ? endSize : midSize));

    nodes.call(
      createDrag((ev) => {
        if (ev === 'end') {
          simulation.alphaTarget(0);
        } else {
          simulation
            .alpha(options.alphaTarget * 2)
            .alphaTarget(options.alphaTarget)
            .restart();
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
 * Create subgraph for spring.
 */
const createGraph = (
  graph: GraphModel<GraphNode<SimulationNodeDatum>>,
  id: string,
  p1: Point,
  p2: Point | undefined,
  options: RopeOptions,
): GraphNode<SimulationNodeDatum> => {
  const d = p2 && options.nodes > 1 ? pointDivide(pointSubtract(p2, p1), options.nodes - 1) : { x: 0, y: -1 };

  let source: GraphNode<SimulationNodeDatum> = {
    id: `${id}-0`,
    type: 'start',
    data: { ...p1, fx: p1.x, fy: p1.y },
  };
  graph.addNode(source);

  range(options.nodes - 1).forEach((_, i) => {
    const last = i === options.nodes - 2;
    const p = pointAdd({ x: source.data.x ?? 0, y: source.data.y ?? 0 }, d);
    const target: GraphNode<SimulationNodeDatum> = {
      id: `${id}-${i + 1}`,
      type: last ? 'end' : undefined,
      data: last && p2 ? { ...p2, fx: p2.x, fy: p2.y } : { ...p },
    };

    graph.addNode(target);
    graph.addEdge({ source: source.id, target: target.id });
    source = target;
  });

  return source;
};

/**
 * Create force simulation.
 * Each graph node data property contains the starting datum for the simulation.
 * The graph nodes are copied into the simulation since the simulation mutates them.
 */
export const createSimulation = (graph: GraphModel<GraphNode<SimulationNodeDatum>>, options: RopeOptions) => {
  const simulation = d3
    .forceSimulation<any>(graph.nodes.map((node) => ({ id: node.id, ...node.data, data: node })))
    .force(
      'link',
      d3
        .forceLink(graph.edges.map((edge) => ({ ...edge })))
        .id((d: any) => d.id)
        .distance(options.linkLength)
        .strength(options.linkStrength),
    )
    .force('gravity', (alpha) => {
      simulation.nodes().forEach((node) => {
        if (!node.fx) {
          node.vy = (node.vy ?? 0) + options.gravity * alpha;
          node.y = (node.y ?? 0) + node.vy;
        }
      });
    })
    .alphaTarget(options.alphaTarget)
    .alphaMin(0.01)
    .alphaDecay(0.001) // Slower decay for longer-lasting movement.
    .velocityDecay(0.05); // Lower decay for more elastic movement.

  return simulation;
};

/**
 * Drag behavior.
 */
export const createDrag = (cb: (event: 'start' | 'drag' | 'end') => void) =>
  d3
    .drag<SVGCircleElement, any>()
    .on('start', ((event: D3DragEvent<SVGCircleElement, any, any>) => {
      cb('start');
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }) as any)
    .on('drag', (event) => {
      cb('drag');
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    })
    .on('end', (event) => {
      cb('end');
      if (!event.sourceEvent.shiftKey) {
        event.subject.fx = null;
        event.subject.fy = null;
      }
    });
