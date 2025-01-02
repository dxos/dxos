//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import { type GraphEdge, type GraphNode } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { DATA_TEST_ID, ProjectionMapper, useProjection, zoomTo, zoomInPlace } from '@dxos/react-ui-canvas';
import { isNotFalsy } from '@dxos/util';

import { useEditorContext } from './useEditorContext';
import { type ActionHandler } from '../actions';
import { type TestId } from '../components';
import { doLayout, getCenter, getRect, rectUnion, fireBullet } from '../layout';
import { createRectangle } from '../shapes';
import { createId, itemSize } from '../testing';
import { type Connection, isPolygon, type Shape } from '../types';

// TODO(burdon): Handle multiple actions.
export const useActionHandler = () => {
  const {
    clipboard,
    graph,
    graphMonitor,
    options,
    overlayRef,
    selection,
    setDebug,
    setShowGrid,
    setSnapToGrid,
    setActionHandler,
    repaint,
  } = useEditorContext();
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

        // TODO(burdon): Manage undo/redo history via automerge?
        case 'undo': {
          return true;
        }
        case 'redo': {
          return true;
        }

        // TODO(burdon): Factor out graph mutators.
        case 'cut': {
          const { ids = selection.selected.value } = action;
          clipboard.clear().addGraphs([graph.removeNodes(ids), graph.removeEdges(ids)]);
          selection.clear();
          return true;
        }
        case 'copy': {
          const { ids = selection.selected.value } = action;
          const nodes = ids.map((id) => graph.getNode(id)).filter(isNotFalsy);
          const edges = ids.map((id) => graph.getEdge(id)).filter(isNotFalsy);
          clipboard.clear().addNodes(nodes).addEdges(edges);
          return true;
        }
        case 'paste': {
          // TODO(burdon): Change ids if pasting copy (update links).
          graph.addGraph(clipboard);
          selection.setSelected([...clipboard.nodes.map((node) => node.id), ...clipboard.edges.map((edge) => edge.id)]);
          clipboard.clear();
          return true;
        }

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
          const node: GraphNode<Shape> = { id: shape.id, data: shape };
          graphMonitor?.onCreate(node);
          graph.addNode(node);
          selection.setSelected([shape.id]);
          return true;
        }
        case 'link': {
          const { source, target, connection } = action;
          const id = createId();
          const edge: GraphEdge<Connection> = { id, source, target, data: connection ?? {} };
          graph.addEdge(edge);
          graphMonitor?.onLink(edge);
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
          repaint(); // TODO(burdon): Hack since graph doesn't trigger layout update.
          return true;
        }

        case 'trigger': {
          const { ids = selection.selected.value } = action;
          for (const id of ids) {
            const g = overlayRef.current!.querySelector<SVGGElement>(
              `g[${DATA_TEST_ID}="${'dx-overlay-bullets' satisfies TestId}"]`,
            );
            if (g && id) {
              // TODO(burdon): Return cancel.
              fireBullet(root, g, graph, id);
            }
          }
          return true;
        }

        default:
          return false;
      }
    };

    setActionHandler(actionHandler);
  }, [root, overlayRef, options, graph, graphMonitor, selection, projection]);
};
