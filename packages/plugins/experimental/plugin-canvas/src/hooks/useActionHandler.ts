//
// Copyright 2024 DXOS.org
//

import * as d3 from 'd3';
import { useCallback } from 'react';

import { invariant } from '@dxos/invariant';

import { useEditorContext } from './useEditorContext';
import { getZoomTransform } from './useWheel';
import { type ActionHandler } from '../actions';
import { createRect } from '../graph';
import { getCenter, modelToScreen, rectUnion } from '../layout';
import { createId, itemSize } from '../testing';

/**
 * Handle actions.
 */
export const useActionHandler = (): ActionHandler => {
  const {
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
  } = useEditorContext();

  const zoom = (scale: number, newScale: number, delay = 200) => {
    const is = d3.interpolateNumber(scale, newScale);
    const pos = { x: width / 2, y: height / 2 };
    d3.transition()
      .ease(d3.easeSinOut)
      .duration(delay)
      .tween('scale', () => (t) => setTransform(getZoomTransform({ scale, newScale: is(t), offset, pos })));
  };

  // TODO(burdon): Handle multiple.
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
          const is = d3.interpolate(offset, { x: width / 2, y: height / 2 });
          d3.transition()
            .ease(d3.easeSinOut)
            .duration(200)
            .tween('scale', () => (t) => setTransform({ scale, offset: { ...is(t) } }));
          return true;
        }
        case 'zoom-in': {
          const newScale = Math.round(scale) * options.zoomFactor;
          if (newScale > 16) {
            return false;
          }
          zoom(scale, newScale);
          return true;
        }
        case 'zoom-out': {
          const newScale = Math.round(scale) / options.zoomFactor;
          if (Math.round(scale) === 0) {
            return false;
          }
          zoom(scale, newScale);
          return true;
        }
        case 'bounds': {
          const rect = rectUnion(graph.nodes.filter((node) => node.data.type === 'rect').map((node) => node.data.rect));
          const center = getCenter(rect);
          const newCenter = modelToScreen(scale, { x: width / 2, y: height / 2 }, { x: -center.x, y: -center.y });
          const is = d3.interpolate(offset, newCenter);
          d3.transition()
            .ease(d3.easeSinOut)
            .duration(200)
            .tween('scale', () => (t) => setTransform({ scale, offset: { ...is(t) } }));
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
    },
    [width, height, scale, offset],
  );
};
