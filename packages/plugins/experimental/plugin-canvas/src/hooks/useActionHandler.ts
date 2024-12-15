//
// Copyright 2024 DXOS.org
//

import * as d3 from 'd3';
import { useCallback } from 'react';

import { useEditorContext } from './useEditorContext';
import { type ActionHandler } from '../actions';
import { createRect } from '../graph';
import { createId, itemSize } from '../testing';

const scaleFactor = 2;

/**
 * Handle actions.
 */
export const useActionHandler = (): ActionHandler => {
  const { width, height, scale, offset, graph, selection, setTransform, setDebug, setShowGrid, setSnapToGrid } =
    useEditorContext();

  return useCallback<ActionHandler>(
    (action) => {
      const { type } = action;
      switch (type) {
        case 'debug': {
          setDebug((debug) => !debug);
          return true;
        }
        case 'grid': {
          setShowGrid((showGrid) => action?.on ?? !showGrid);
          return true;
        }
        case 'snap': {
          setSnapToGrid((snapToGrid) => action?.on ?? !snapToGrid);
          return true;
        }

        case 'center': {
          const is = d3.interpolate(offset, { x: width / 2, y: height / 2 });
          d3.transition()
            .ease(d3.easeSinOut)
            .duration(200)
            .tween('scale', () => (t) => setTransform({ scale, offset: { ...is(t) } }));
          return true;
        }
        case 'zoom-in': {
          const is = d3.interpolateNumber(scale, scale * scaleFactor);
          d3.transition()
            .ease(d3.easeSinOut)
            .duration(200)
            .tween('scale', () => (t) => setTransform({ scale: is(t), offset }));
          return true;
        }
        case 'zoom-out': {
          const is = d3.interpolateNumber(scale, scale / scaleFactor);
          d3.transition()
            .ease(d3.easeSinOut)
            .duration(200)
            .tween('scale', () => (t) => setTransform({ scale: is(t), offset }));
          return true;
        }

        // TODO(burdon): Factor out graph handlers. Undo.
        case 'create': {
          const id = createId();
          graph.addNode({ id, data: createRect({ id, pos: { x: 0, y: 0 }, size: itemSize }) });
          selection.setSelected([id]);
          return true;
        }
        case 'delete': {
          const { ids } = action;
          ids?.forEach((id) => graph.removeNode(id));
          ids?.forEach((id) => graph.removeEdge(id));
          selection.clear();
          return true;
        }

        default:
          return false;
      }
    },
    [width, height, scale, offset],
  );
};
