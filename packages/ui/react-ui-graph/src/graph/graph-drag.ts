//
// Copyright 2021 DXOS.org
//

import { drag, pointer, select, type Simulation } from 'd3';

import { type GraphLayoutEdge, type GraphLayoutNode } from './types';
import { type SVGContext } from '../hooks';
import { type D3DragEvent } from '../typings';
import { type Point } from '../util';

export interface DragOptions<N> {
  dragMod?: string;
  linkMod?: string;
  freezeMod?: string;
  onDrag?: (source?: GraphLayoutNode<N>, target?: GraphLayoutNode<N>, point?: Point) => void;
  onDrop?: (source: GraphLayoutNode<N>, target?: GraphLayoutNode<N>) => void;
}

const defaultDragOptions: DragOptions<any> = {
  linkMod: 'metaKey',
  freezeMod: 'shiftKey',
};

enum Mode {
  MOVE = 0,
  LINK = 1,
}

/**
 * @param context
 * @param simulation
 * @param options
 */
export const createSimulationDrag = <N>(
  context: SVGContext,
  simulation: Simulation<GraphLayoutNode<N>, GraphLayoutEdge<N>>,
  options: DragOptions<N> = defaultDragOptions,
) => {
  let mode: Mode;
  let source: GraphLayoutNode<N>;
  let target: GraphLayoutNode<N>;
  let offset: Point | undefined;

  const keyMod = (event: MouseEvent, key: string): boolean => {
    const modKey = options?.[key] ?? defaultDragOptions[key];
    return modKey === undefined || event[modKey];
  };

  return drag()
    .filter((event: MouseEvent) => !event.ctrlKey)
    .on('start', function (event: D3DragEvent) {
      const node = select(this).node();
      offset = pointer(event, node.parentElement);

      if (options?.onDrop && keyMod(event.sourceEvent, 'linkMod')) {
        mode = Mode.LINK;
      } else if (keyMod(event.sourceEvent, 'dragMod')) {
        mode = Mode.MOVE;
      }
    })
    .on('drag', function (event: D3DragEvent, d) {
      // d3.select(this).style('pointer-events', 'none');
      switch (mode) {
        case Mode.MOVE: {
          const node = select(this).node();
          const data = select(node).datum() as GraphLayoutNode<N>;
          if (data !== d) {
            return;
          }

          // Calculate position relative to center.
          const [dx, dy] = pointer(event, node.parentElement);
          const x = data.x + dx - offset[0];
          const y = data.y + dy - offset[1];

          // Freeze node while dragging.
          event.subject.x = event.subject.fx = x;
          event.subject.y = event.subject.fy = y;

          simulation.alphaTarget(0).alpha(1).restart();
          select(context.svg).attr('cursor', 'grabbing');
          break;
        }

        case Mode.LINK: {
          // Get drop target.
          if (options?.onDrag) {
            const point: Point = pointer(event, this);
            target = simulation.find(event.x, event.y, 16);
            if (source === target) {
              select(context.svg).attr('cursor', undefined);
              options?.onDrag?.();
            } else {
              select(context.svg).attr('cursor', 'none');
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
        event.subject.fx = null;
        event.subject.fy = null;
      }

      mode = undefined;
      source = undefined;
      target = undefined;
      offset = undefined;
      select(context.svg).attr('cursor', undefined);
    });
};
