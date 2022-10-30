//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';
import { Simulation } from 'd3-force';

import { D3DragEvent, Point, SVGContext } from '@dxos/gem-core';

import { GraphLayoutLink, GraphLayoutNode, GraphNode } from './types';

export interface DragOptions<N extends GraphNode> {
  dragMod?: string;
  linkMod?: string;
  freezeMod?: string;
  onDrag?: (source?: GraphLayoutNode<N>, target?: GraphLayoutNode<N>, point?: Point) => void;
  onDrop?: (source: GraphLayoutNode<N>, target?: GraphLayoutNode<N>) => void;
}

export const defaultOptions: DragOptions<any> = {
  linkMod: 'metaKey',
  freezeMod: 'shiftKey'
};

enum Mode {
  MOVE = 0,
  LINK = 1
}

/**
 * @param context
 * @param simulation
 * @param options
 */
export const createSimulationDrag = <N extends GraphNode>(
  context: SVGContext,
  simulation: Simulation<GraphLayoutNode<N>, GraphLayoutLink<N>>,
  options: DragOptions<N> = defaultOptions
) => {
  let mode: Mode;
  let source: GraphLayoutNode<N>;
  let target: GraphLayoutNode<N>;

  const keyMod = (event: MouseEvent, key: string): boolean => {
    const modKey = options?.[key] ?? defaultOptions[key];
    return modKey === undefined || event[modKey];
  };

  return d3
    .drag()
    .filter((event: MouseEvent) => !event.ctrlKey)

    .on('start', (event: D3DragEvent) => {
      source = event.subject;
      if (options?.onDrop && keyMod(event.sourceEvent, 'linkMod')) {
        mode = Mode.LINK;
      } else if (keyMod(event.sourceEvent, 'dragMod')) {
        mode = Mode.MOVE;
      }
    })

    .on('drag', function (event: D3DragEvent) {
      // d3.select(this).style('pointer-events', 'none');
      switch (mode) {
        case Mode.MOVE: {
          d3.select(context.svg).attr('cursor', 'grabbing');

          // Freeze node while dragging.
          event.subject.fx = event.x;
          event.subject.fy = event.y;
          simulation.alphaTarget(0).alpha(1).restart();
          break;
        }

        case Mode.LINK: {
          // Get drop target.
          if (options?.onDrag) {
            const point: Point = d3.pointer(event, this);
            target = simulation.find(event.x, event.y, 16);
            if (source === target) {
              d3.select(context.svg).attr('cursor', undefined);
              options?.onDrag?.();
            } else {
              d3.select(context.svg).attr('cursor', 'none');
              options?.onDrag?.(source, target, point);
            }
          }
        }
      }
    })

    .on('end', (event: D3DragEvent) => {
      // d3.select(this).style('pointer-events', undefined);

      switch (mode) {
        case Mode.LINK: {
          options?.onDrop?.(source, target);
          break;
        }
      }

      // Freeze node.
      if (!keyMod(event.sourceEvent, 'freezeMod')) {
        event.subject.fx = undefined;
        event.subject.fy = undefined;
      }

      mode = undefined;
      source = undefined;
      d3.select(context.svg).attr('cursor', undefined);
    });
};
