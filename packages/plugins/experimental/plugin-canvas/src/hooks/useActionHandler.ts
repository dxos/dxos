//
// Copyright 2024 DXOS.org
//

import { useCallback } from 'react';

import { useEditorContext } from './useEditorContext';
import { useGraph } from './useGraph';
import { type ActionHandler } from '../actions';
import { createId, itemSize } from '../testing';

/**
 * Handle actions.
 */
export const useActionHandler = (): ActionHandler => {
  const { width, height, scale, selection, setTransform, setDebug, setShowGrid, setSnapToGrid } = useEditorContext();
  const graph = useGraph();

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

        // TODO(burdon): Animate.
        case 'center': {
          setTransform({ offset: { x: width / 2, y: height / 2 }, scale: 1 });
          return true;
        }
        case 'zoom-in': {
          setTransform({ offset: { x: width / 2, y: height / 2 }, scale: scale * 1.5 });
          return true;
        }
        case 'zoom-out': {
          setTransform({ offset: { x: width / 2, y: height / 2 }, scale: scale / 1.5 });
          return true;
        }

        // TODO(burdon): Factor out graph handlers. Undo.
        case 'create': {
          const id = createId();
          graph.addNode({ id, data: { id, pos: { x: 0, y: 0 }, size: itemSize } });
          selection.clear();
          return true;
        }
        case 'delete': {
          const { ids } = action;
          ids?.forEach((id) => graph.removeNode(id));
          ids?.forEach((id) => graph.removeEdge(id));
          selection.clear();
          return true;
        }
      }

      return false;
    },
    [width, height, scale],
  );
};
