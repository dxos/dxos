//
// Copyright 2021 DXOS.org
//

import { drag, pointer, select } from 'd3';

import { type SVGContext } from '../../hooks';
import { type Point } from '../../util';
import { type GraphLayoutNode } from '../types';

import { type GraphProjector } from './graph-projector';

enum Mode {
  MOVE = 0,
  LINK = 1,
}

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

/**
 * Create drag handler.
 */
export const createGraphDrag = <NodeData>(
  context: SVGContext,
  projector: GraphProjector<NodeData>,
  options: DragOptions<NodeData> = defaultDragOptions,
) => {
  let mode: Mode;
  let source: GraphLayoutNode<NodeData>;
  let target: GraphLayoutNode<NodeData> | undefined;
  let offset: Point | undefined;
  let moved = false;

  const keyMod = (event: MouseEvent, key: string): boolean => {
    const modKey = options?.[key] ?? defaultDragOptions[key];
    return modKey === undefined || event[modKey];
  };

  return drag<SVGElement, GraphLayoutNode<NodeData>>()
    .filter((event: MouseEvent) => !event.ctrlKey)
    .on('start', function (event, d) {
      source = d;
      offset = pointer(event, this.parentElement);

      if (options?.onDrop && keyMod(event.sourceEvent, 'linkMod')) {
        mode = Mode.LINK;
      } else if (keyMod(event.sourceEvent, 'dragMod')) {
        mode = Mode.MOVE;
      }
    })
    .on('drag', function (event, d) {
      const parent = this.closest('g.node');
      select(parent).classed('dragging', true).raise();

      // Calculate position.
      const [dx, dy] = pointer(event, this.parentElement);
      const x = d.x + dx - offset[0];
      const y = d.y + dy - offset[1];
      const point: Point = [x, y];

      switch (mode) {
        case Mode.MOVE: {
          select(context.svg).attr('cursor', 'grabbing');

          // Freeze node while dragging.
          event.subject.x = event.subject.fx = point[0];
          event.subject.y = event.subject.fy = point[1];
          projector.refresh(true);
          moved = true;
          break;
        }

        case Mode.LINK: {
          // Get drop target.
          if (options?.onDrag) {
            target = projector.findNode(event.x, event.y, 16);
            if (source === target) {
              select(context.svg).attr('cursor', undefined);
              options?.onDrag?.();
            } else {
              select(context.svg).attr('cursor', target ? 'alias' : 'cell');
              options?.onDrag?.(source, target, point);
            }
          }
        }
      }
    })
    .on('end', function (event) {
      select(context.svg).attr('cursor', undefined);
      select(this.parentElement).classed('dragging', false);
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

      if (moved) {
        projector.refresh(false);
        moved = false;
      }
    });
};
