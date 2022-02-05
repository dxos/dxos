//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';
import { Simulation } from 'd3-force';

import { D3DragEvent, Point, SVGContext } from '@dxos/gem-core';

import { GraphLink, GraphNode } from './types';

export interface DragOptions<T> {
  dragMod?: string
  linkMod?: string
  freezeMod?: string
  onDrag?: (source?: GraphNode<T>, target?: GraphNode<T>, point?: Point) => void
  onDrop?: (source: GraphNode<T>, target?: GraphNode<T>) => void
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
export const createSimulationDrag = <T extends any>(
  context: SVGContext,
  simulation: Simulation<GraphNode<T>, GraphLink<T>>,
  options: DragOptions<T> = defaultOptions
) => {
  let mode: Mode = undefined;
  let started = false;
  let source: GraphNode<T> = undefined;
  let target: GraphNode<T> = undefined;

  const keyMod = (event: MouseEvent, key: string): boolean => {
    const modKey = options?.[key] ?? defaultOptions[key];
    return modKey === undefined || event[modKey];
  }

  return d3.drag()
    .filter(function (event: MouseEvent) {
      return !event.ctrlKey;
    })

    .on('start', function (event: D3DragEvent) {
      source = event.subject;
      if (options?.onDrop && keyMod(event.sourceEvent, 'linkMod')) {
        mode = Mode.LINK;
      } else if (keyMod(event.sourceEvent, 'dragMod')) {
        mode = Mode.MOVE;
      }
    })

    .on('drag', function (event: D3DragEvent) {
      started = true;

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

    .on('end', function (event: D3DragEvent) {
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
      started = false;
      source = undefined;
      d3.select(context.svg).attr('cursor', undefined);
    });
};
