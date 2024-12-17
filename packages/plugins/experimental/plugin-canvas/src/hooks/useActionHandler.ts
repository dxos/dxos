//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type EditorContextType } from './context';
import { useEditorContext } from './useEditorContext';
import { type ActionHandler } from '../actions';
import { createRect } from '../graph';
import { getCenter, modelToScreen, rectUnion, zoomTo, zoomInPlace } from '../layout';
import { createId, itemSize } from '../testing';

export const useActionHandler = (): ActionHandler => {
  const context = useEditorContext();
  const handler = handleAction(context);
  return (action) => handler(action);
};

/**
 * Handle actions.
 */
export const handleAction = ({
  options,
  width,
  height,
  scale,
  offset,
  graph,
  selection,
  setTransform,
  setDebug,
  setShowGrid,
  setSnapToGrid,
}: EditorContextType): ActionHandler => {
  return (action) => {
    const { type } = action;
    log.info('action', { action });
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
      case 'select': {
        const { ids, shift } = action;
        selection.setSelected(ids, shift);
        return true;
      }

      case 'home': {
        setTransform({ scale: 1, offset: { x: width / 2, y: height / 2 } });
        return true;
      }
      case 'center': {
        zoomTo(setTransform, { scale, offset }, { scale: 1, offset: { x: width / 2, y: height / 2 } });
        return true;
      }
      case 'zoom-to-fit': {
        const { duration = 200 } = action;
        const bounds = rectUnion(graph.nodes.filter((node) => node.data.type === 'rect').map((node) => node.data.rect));
        const center = getCenter(bounds);
        const newScale = Math.min(width / bounds.width, height / bounds.height);
        const [newOffset] = modelToScreen(newScale, { x: width / 2, y: height / 2 }, [{ x: -center.x, y: -center.y }]);
        if (duration) {
          zoomTo(setTransform, { scale, offset }, { scale: newScale, offset: newOffset }, duration);
        } else {
          setTransform({ scale: newScale, offset: newOffset });
        }
        return true;
      }
      case 'zoom-in': {
        const newScale = Math.round(scale) * options.zoomFactor;
        if (newScale > 16) {
          return false;
        }
        zoomInPlace(setTransform, getCenter({ x: 0, y: 0, width, height }), offset, scale, newScale);
        return true;
      }
      case 'zoom-out': {
        const newScale = Math.round(scale) / options.zoomFactor;
        if (Math.round(scale) === 0) {
          return false;
        }
        zoomInPlace(setTransform, getCenter({ x: 0, y: 0, width, height }), offset, scale, newScale);
        return true;
      }

      // TODO(burdon): Factor out graph handlers. Undo.
      case 'create': {
        let { shape } = action;
        if (!shape) {
          const id = createId();
          shape = createRect({ id, pos: { x: 0, y: 0 }, size: itemSize });
        }
        invariant(shape);
        graph.addNode({ id: shape.id, data: shape });
        selection.setSelected([shape.id]);
        return true;
      }
      case 'link': {
        const { source, target } = action;
        graph.addEdge({ id: createId(), source, target });
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
  };
};
