//
// Copyright 2024 DXOS.org
//

import { monitorForElements, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { mx } from '@dxos/react-ui-theme';
import { isNotFalsy } from '@dxos/util';

import { Frame, FrameDragPreview } from './Frame';
import { type DragPayloadData } from './Shape';
import { GraphWrapper, type Item } from '../../graph';
import {
  useBoundingSelection,
  useSnap,
  useTransform,
  useEditorContext,
  useShortcuts,
  useActionHandler,
  type BoundingSelectionCallback,
} from '../../hooks';
import { useWheel } from '../../hooks/useWheel';
import {
  boundsContain,
  boundsToModel,
  createPathThroughPoints,
  getBounds,
  getInputPoint,
  findClosestIntersection,
  type Rect,
  type Dimension,
  type Point,
} from '../../layout';
import { createGraph, createId, testElement } from '../../testing';
import { Grid } from '../Grid';
import { Markers, eventsNone, styles, eventsAuto } from '../styles';
import { testId } from '../util';

const itemSize: Dimension = { width: 128, height: 64 };

export type CanvasProps = {};

export const Canvas = (_: CanvasProps) => {
  const { width, height, scale, offset, showGrid, selection, dragging, setTransform, setDragging, setLinking } =
    useEditorContext();
  const containerRef = useRef<HTMLDivElement>(null);

  // TODO(burdon): Generalize model.
  const snapPoint = useSnap();
  const [graph] = useState(() => new GraphWrapper(createGraph(itemSize, snapPoint)));

  // Canvas scale.
  const { ready, styles: transformStyles } = useTransform();

  //
  // Drop target.
  //
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    return dropTargetForElements({
      element: el,
      getData: () => ({ type: 'Canvas' }),
    });
  }, [containerRef.current]);

  //
  // Event handlers.
  //
  useWheel(containerRef.current, width, height, setTransform);
  useShortcuts(containerRef.current);
  useActionHandler();

  // TODO(burdon): Replace with context state.
  const [itemDragging, setItemDragging] = useState<Pick<Item, 'id' | 'pos'>>();
  const [itemLinking, setItemLinking] = useState<{ source: { center: Point; bounds: Rect }; target: Point }>();

  //
  // Cursor/overlay.
  //
  const handleSelectionBounds = useCallback<BoundingSelectionCallback>(
    (bounds, shift) => {
      if (!bounds) {
        selection.clear();
        return;
      }

      // Map the pointer event to the SVG coordinate system.
      const selectionBounds = boundsToModel(containerRef.current!.getBoundingClientRect(), scale, offset, bounds);
      const selected = graph.nodes
        .filter(
          ({ data: { pos } }) => boundsContain(selectionBounds, { ...pos, width: 0, height: 0 }), // Check center point.
        )
        .map(({ id }) => id);
      selection.setSelected(selected, shift);
    },
    [containerRef, selection, scale, offset],
  );
  const selectionBounds = useBoundingSelection(containerRef.current, handleSelectionBounds);

  //
  // Monitor dragging and linking.
  //
  useEffect(() => {
    return monitorForElements({
      onDrag: ({ source, location }) => {
        const rect = containerRef.current!.getBoundingClientRect();
        const pos = boundsToModel(rect, scale, offset, getInputPoint(location.current.input));
        const { type, item } = source.data as DragPayloadData;
        switch (type) {
          case 'frame': {
            setItemDragging({ id: item.id, pos });
            break;
          }

          case 'anchor': {
            setItemLinking({ source: { center: item.pos, bounds: getBounds(item.pos, item.size) }, target: pos });
            break;
          }
        }
      },

      onDrop: ({ source, location }) => {
        const rect = containerRef.current!.getBoundingClientRect();
        const pos = boundsToModel(rect, scale, offset, getInputPoint(location.current.input));
        const { type, item } = source.data as DragPayloadData;
        switch (type) {
          case 'frame': {
            const item = source.data.item as Item;
            // TODO(burdon): Adjust for offset.
            // const pos = boundsToModelWithOffset(rect, scale, offset, item.pos, location.initial, location.current);
            item.pos = snapPoint(pos);
            setItemDragging(undefined);
            setDragging(undefined);
            break;
          }

          case 'anchor': {
            const target = location.current.dropTargets.find(({ data }) => data.type === 'frame')?.data.item as Item;
            let id = target?.id;
            if (!id) {
              id = createId();
              graph.addNode({ id, data: { id, pos: snapPoint(pos), size: itemSize } });
            }
            graph.addEdge({ id: createId(), source: item.id, target: id, data: {} });
            setItemLinking(undefined);
            setLinking(undefined);
            break;
          }
        }
      },
    });
  }, [containerRef, snapPoint, scale, offset, graph]);

  // Edges.
  // TODO(burdon): Factor out.
  const edges = getEdges(graph, itemDragging);
  if (itemLinking) {
    const { center: p1, bounds: r1 } = itemLinking.source;
    const p2 = itemLinking.target;
    const i1 = r1 ? findClosestIntersection([p2, p1], r1) ?? p1 : p1;
    const i2 = p2;
    edges.push({ id: 'link', path: createPathThroughPoints([i1, i2]) });
  }

  // TODO(burdon): Factor out rendering (consider making pluggable).
  // TODO(burdon): Rendering notes.
  //  - svg.transform-origin

  return (
    <div ref={containerRef} tabIndex={0} className={mx('absolute inset-0 overflow-hidden')} {...testId('dx-canvas')}>
      {/* Background. */}
      <Background />

      {/* Grid. */}
      {ready && showGrid && <Grid offset={offset} scale={scale} />}

      {/* Content. */}
      {ready && (
        <div {...testId('dx-html-content')} style={transformStyles}>
          {graph.nodes.map(({ data: item }) => (
            <Frame
              key={item.id}
              item={item}
              scale={scale}
              selected={selection.contains(item.id)}
              onSelect={(id, shift) => selection.toggleSelected([id], shift)}
            />
          ))}
          {edges.map(({ id, path }) => (
            <div className={mx('')} key={id}>
              <svg {...testElement()} className={mx('absolute overflow-visible', eventsNone)}>
                <defs>
                  <Markers />
                </defs>
                <g key={id}>
                  {/* Hit area. */}
                  <path
                    d={path}
                    fill='none'
                    strokeWidth={8}
                    className={mx('stroke-transparent', eventsAuto)}
                    onClick={(ev) => selection.toggleSelected([id], ev.shiftKey)}
                  />
                  <path
                    d={path}
                    fill='none'
                    strokeWidth={1}
                    className={mx(styles.edge, selection.contains(id) && styles.edgeSelected)}
                    // TODO(burdon): Edge style.
                    markerStart={id !== 'link' ? 'url(#circle)' : ''}
                    markerEnd={id !== 'link' ? 'url(#circle)' : ''}
                  />
                </g>
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* Overlays. */}
      <div {...testId('dx-overlays')} className={mx('absolute top-0 left-0 w-full h-full', eventsNone)}>
        {/* Selection overlay. */}
        <svg width='100%' height='100%' className={mx('absolute top-0 left-0 cursor-crosshair')}>
          <g>
            {selectionBounds && <rect {...selectionBounds} opacity={0.2} strokeWidth={2} className={styles.cursor} />}
          </g>
        </svg>

        {/* Drag preview. */}
        {dragging &&
          createPortal(
            <div style={transformStyles}>
              <FrameDragPreview item={dragging.item} />
            </div>,
            dragging.container,
          )}
      </div>
    </div>
  );
};

const Background = () => {
  return <div {...testId('dx-background')} className={mx('absolute inset-0 bg-base', eventsNone)} />;
};

// TODO(burdon): Factor out.
export const getEdges = (graph: GraphWrapper, dragging?: Pick<Item, 'id' | 'pos'>): { id: string; path: string }[] => {
  const getPos = (id: string): { center: Point; bounds: Rect } | undefined => {
    const node = graph.getNode(id);
    if (dragging?.id === id) {
      return { center: dragging.pos, bounds: getBounds(dragging.pos, node?.data.size) };
    }

    if (node) {
      return { center: node.data.pos, bounds: getBounds(node.data.pos, node.data.size) };
    }

    return undefined;
  };

  return graph.edges
    .map(({ id, source, target }) => {
      const { center: p1, bounds: r1 } = getPos(source) ?? {};
      const { center: p2, bounds: r2 } = getPos(target) ?? {};
      if (!p1 || !p2) {
        return null;
      }

      const i1 = r1 ? findClosestIntersection([p2, p1], r1) ?? p1 : p1;
      const i2 = r2 ? findClosestIntersection([p1, p2], r2) ?? p2 : p2;
      return { id, path: createPathThroughPoints([i1, i2]) };
    })
    .filter(isNotFalsy);
};
