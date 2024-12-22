//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { DATA_TEST_ID, useProjection, zoomTo, zoomInPlace, ProjectionMapper } from '@dxos/react-ui-canvas';

import { useEditorContext } from './useEditorContext';
import { type ActionHandler } from '../actions';
import { type TestId } from '../components';
import { createRectangle, doLayout, getCenter, getRect, rectUnion } from '../layout';
import { fireBullet } from '../layout/bullets';
import { createId, itemSize } from '../testing';
import { isPolygon } from '../types';

// TODO(burdon): Handle multiple actions.
export const useActionHandler = () => {
  const { options, overlaySvg, graph, selection, setDebug, setShowGrid, setSnapToGrid, setActionHandler } =
    useEditorContext();
  const { root, projection, setProjection } = useProjection();

  useEffect(() => {
    const actionHandler: ActionHandler = async (action) => {
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
          setProjection({ scale: 1, offset: getCenter(projection.bounds) });
          return true;
        }
        case 'center': {
          zoomTo(
            setProjection,
            { scale: projection.scale, offset: projection.offset },
            { scale: 1, offset: getCenter(projection.bounds) },
            options.zoomDuration,
          );
          return true;
        }

        case 'zoom-to-fit': {
          const { duration = options.zoomDuration } = action;
          const nodes = graph.nodes
            .filter((node) => isPolygon(node.data))
            .map((node) => getRect(node.data.center, node.data.size));
          if (!nodes.length) {
            return false;
          }

          const bounds = rectUnion(nodes);
          const center = getCenter(bounds);
          const padding = 256;
          const newScale = Math.min(
            1,
            Math.min(
              projection.bounds.width / (bounds.width + padding),
              projection.bounds.height / (bounds.height + padding),
            ),
          );
          const mapper = new ProjectionMapper(projection.bounds, newScale, getCenter(projection.bounds));
          const [newOffset] = mapper.toScreen([{ x: -center.x, y: -center.y }]);
          if (duration) {
            zoomTo(
              setProjection,
              { scale: projection.scale, offset: projection.offset },
              { scale: newScale, offset: newOffset },
              duration,
            );
          } else {
            setProjection({ scale: newScale, offset: newOffset });
          }
          return true;
        }
        case 'zoom-in': {
          const newScale = Math.round(projection.scale) * options.zoomFactor;
          if (newScale > 16) {
            return false;
          }
          zoomInPlace(
            setProjection,
            getCenter({ x: 0, y: 0, ...projection.bounds }),
            projection.offset,
            projection.scale,
            newScale,
          );
          return true;
        }
        case 'zoom-out': {
          const newScale = Math.round(projection.scale) / options.zoomFactor;
          if (Math.round(projection.scale) === 0) {
            return false;
          }
          zoomInPlace(
            setProjection,
            getCenter({ x: 0, y: 0, ...projection.bounds }),
            projection.offset,
            projection.scale,
            newScale,
          );
          return true;
        }

        case 'layout': {
          const layout = await doLayout(graph, { layout: action.layout });
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
          const { ids = selection.selected.value, all } = action;
          if (all) {
            graph.clear();
            void actionHandler?.({ type: 'center' });
          } else {
            ids?.forEach((id) => graph.removeNode(id));
            ids?.forEach((id) => graph.removeEdge(id));
          }
          selection.clear();
          return true;
        }

        case 'run': {
          const { id = selection.selected.value[0] } = action;
          const g = overlaySvg.current!.querySelector<SVGGElement>(
            `g[${DATA_TEST_ID}="${'dx-overlay-bullets' satisfies TestId}"]`,
          );
          if (g && id) {
            // TODO(burdon): Return cancel.
            fireBullet(root, g, graph, id);
          }
          return true;
        }

        default:
          return false;
      }
    };

    setActionHandler(actionHandler);
  }, [root, overlaySvg, options, graph, selection, projection]);
};
