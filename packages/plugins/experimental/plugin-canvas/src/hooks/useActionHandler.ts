//
// Copyright 2024 DXOS.org
//

import { useCallback, useEffect } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { useProjection, zoomTo, zoomInPlace, ProjectionMapper } from '@dxos/react-ui-canvas';

import { useEditorContext } from './useEditorContext';
import { type ActionHandler } from '../actions';
import { createRectangle, doLayout, getCenter, getRect, rectUnion } from '../layout';
import { createId, itemSize } from '../testing';
import { isPolygon } from '../types';

export const useActionHandler = () => {
  const { options, graph, selection, setDebug, setShowGrid, setSnapToGrid, setActionHandler } = useEditorContext();
  const { width, height, scale, offset, setProjection } = useProjection();

  const actionHandler = useCallback<ActionHandler>(
    async (action) => {
      const { type } = action;
      log('action', { action });
      switch (type) {
        case 'debug': {
          setDebug((debug) => !debug);
          return true;
        }
        case 'grid': {
          setShowGrid((showGrid) => action?.on ?? !showGrid);
          return true;
        }
        case 'grid-snap': {
          setSnapToGrid((snapToGrid) => action?.on ?? !snapToGrid);
          return true;
        }

        case 'home': {
          setProjection({ scale: 1, offset: getCenter({ width, height }) });
          return true;
        }
        case 'center': {
          zoomTo(setProjection, { scale, offset }, { scale: 1, offset: getCenter({ width, height }) });
          return true;
        }

        case 'zoom-to-fit': {
          const { duration = 200 } = action;
          const nodes = graph.nodes
            .filter((node) => isPolygon(node.data))
            .map((node) => getRect(node.data.center, node.data.size));
          if (!nodes.length) {
            return false;
          }

          const bounds = rectUnion(nodes);
          const center = getCenter(bounds);
          const padding = 64;
          const newScale = Math.min(1, Math.min(width / (bounds.width + padding), height / (bounds.height + padding)));
          const mapper = new ProjectionMapper(newScale, getCenter({ width, height }));
          const [newOffset] = mapper.toScreen([{ x: -center.x, y: -center.y }]);
          if (duration) {
            zoomTo(setProjection, { scale, offset }, { scale: newScale, offset: newOffset }, duration);
          } else {
            setProjection({ scale: newScale, offset: newOffset });
          }
          return true;
        }
        case 'zoom-in': {
          const newScale = Math.round(scale) * options.zoomFactor;
          if (newScale > 16) {
            return false;
          }
          zoomInPlace(setProjection, getCenter({ x: 0, y: 0, width, height }), offset, scale, newScale);
          return true;
        }
        case 'zoom-out': {
          const newScale = Math.round(scale) / options.zoomFactor;
          if (Math.round(scale) === 0) {
            return false;
          }
          zoomInPlace(setProjection, getCenter({ x: 0, y: 0, width, height }), offset, scale, newScale);
          return true;
        }

        case 'layout': {
          const layout = await doLayout(graph);
          for (const { id, data } of layout.nodes) {
            const node = graph.getNode(id);
            if (node && isPolygon(data)) {
              const { center, size } = data;
              Object.assign(node.data, { center, size });
            }
          }

          await actionHandler({ type: 'zoom-to-fit' });
          return true;
        }

        // TODO(burdon): Factor out graph handlers. Undo.
        case 'select': {
          const { ids, shift } = action;
          selection.setSelected(ids, shift);
          return true;
        }
        case 'create': {
          let { shape } = action;
          if (!shape) {
            const id = createId();
            shape = createRectangle({ id, center: { x: 0, y: 0 }, size: itemSize });
          }
          invariant(shape);
          graph.addNode({ id: shape.id, data: shape });
          selection.setSelected([shape.id]);
          return true;
        }
        case 'link': {
          const { source, target } = action;
          const id = createId();
          graph.addEdge({ id, source, target });
          selection.setSelected([id]);
          return true;
        }
        case 'delete': {
          const { ids = selection.ids } = action;
          ids?.forEach((id) => graph.removeNode(id));
          ids?.forEach((id) => graph.removeEdge(id));
          selection.clear();
          return true;
        }

        default:
          return false;
      }
    },
    [options, graph, setProjection, selection, width, height, scale, offset],
  );

  useEffect(() => {
    setActionHandler(actionHandler);
  }, [actionHandler]);
};
