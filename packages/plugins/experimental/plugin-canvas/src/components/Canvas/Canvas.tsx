//
// Copyright 2024 DXOS.org
//

import { monitorForElements, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/react-ui-theme';
import { isNotFalsy } from '@dxos/util';

import { Frame, FrameDragPreview } from './Frame';
import { type DragPayloadData, type Item } from './Shape';
import { GraphWrapper } from '../../graph';
import {
  useBoundingSelection,
  useSnap,
  useTransform,
  useEditorContext,
  type SelectionBoundsCallback,
} from '../../hooks';
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
import { createGraph, createId } from '../../testing';
import { Grid } from '../Grid';
import { type ToolbarProps } from '../Toolbar';
import { Markers, eventsNone, styles } from '../styles';
import { testId } from '../util';

const itemSize: Dimension = { width: 128, height: 64 };

export type CanvasProps = {};

export const Canvas = (_: CanvasProps) => {
  const {
    debug,
    width,
    height,
    scale,
    offset,
    showGrid,
    selection,
    dragging,
    setTransform,
    setDragging,
    setLinking,
    handleAction: handleDefaultAction,
  } = useEditorContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasSvgRef = useRef<SVGSVGElement>(null);

  // TODO(burdon): Generalize model.
  const snapPoint = useSnap();
  const [graph] = useState(() => new GraphWrapper(createGraph(itemSize, snapPoint)));

  // Canvas scale.
  const { ready, styles: transformStyles } = useTransform();

  // TODO(burdon): Replace with context state.
  const [itemDragging, setItemDragging] = useState<Pick<Item, 'id' | 'pos'>>();
  const [itemLinking, setItemLinking] = useState<{ source: { center: Point; bounds: Rect }; target: Point }>();

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
  // Events.
  //
  // TODO(burdon): Factor out.
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey) {
        if (!containerRef.current) {
          return;
        }

        setTransform(({ scale, offset }) => {
          const scaleSensitivity = 0.01;
          const newScale = scale * Math.exp(-event.deltaY * scaleSensitivity);
          invariant(containerRef.current);
          const rect = containerRef.current.getBoundingClientRect();
          const pos = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          };
          const newOffset = {
            x: pos.x - (pos.x - offset.x) * (newScale / scale),
            y: pos.y - (pos.y - offset.y) * (newScale / scale),
          };

          return { scale: newScale, offset: newOffset };
        });
      } else {
        setTransform(({ scale, offset: { x, y } }) => ({
          scale,
          offset: { x: x - event.deltaX, y: y - event.deltaY },
        }));
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Backspace': {
          handleAction({
            type: 'delete',
            ids: selection.ids,
          });
          break;
        }
      }
    };

    containerRef.current.addEventListener('wheel', handleWheel);
    containerRef.current.addEventListener('keydown', handleKeyDown);
    return () => {
      containerRef.current?.removeEventListener('wheel', handleWheel);
      containerRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, selection, width, height]);

  //
  // Cursor/overlay.
  //
  const handleSelectionBounds = useCallback<SelectionBoundsCallback>(
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
    [canvasSvgRef, selection, scale, offset],
  );
  const selectionBounds = useBoundingSelection(canvasSvgRef.current, handleSelectionBounds);
  const debugSelectionBounds =
    debug &&
    selectionBounds &&
    boundsToModel(canvasSvgRef.current!.getBoundingClientRect(), scale, offset, selectionBounds);

  //
  // Monitor dragging and linking.
  //
  useEffect(() => {
    return monitorForElements({
      onDrag: ({ source, location }) => {
        const rect = canvasSvgRef.current!.getBoundingClientRect();
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
        const rect = canvasSvgRef.current!.getBoundingClientRect();
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
  }, [canvasSvgRef, snapPoint, scale, offset, graph]);

  //
  // Actions
  //
  const handleAction = useCallback<NonNullable<ToolbarProps['onAction']>>(
    (action) => {
      if (handleDefaultAction(action)) {
        return true;
      }

      const { type } = action;
      switch (type) {
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
    [handleDefaultAction, graph, scale, width, height, selection],
  );

  // TODO(burdon): Edges should be shapes also.
  // TODO(burdon): Perf monitor.

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

  return (
    <div ref={containerRef} tabIndex={0} className={mx('absolute inset-0 overflow-hidden')} {...testId('dx-canvas')}>
      {/* Background. */}
      <Background />

      {/* Grid. */}
      {ready && showGrid && <Grid offset={offset} scale={scale} />}

      {/* Content. */}
      {ready && (
        <>
          {/* SVG content. */}
          <svg
            ref={canvasSvgRef}
            {...testId('dx-svg-content')}
            width='100%'
            height='100%'
            className={mx('absolute top-0 left-0')}
          >
            <defs>
              <Markers />
            </defs>
            <g style={transformStyles}>
              {/* <g> */}
              {/*  {edges.map(({ id, path }) => ( */}
              {/*    <g key={id}> */}
              {/*      /!* Hit area. *!/ */}
              {/*      <path */}
              {/*        d={path} */}
              {/*        fill='none' */}
              {/*        strokeWidth={8} */}
              {/*        className={'stroke-transparent'} */}
              {/*        onClick={(ev) => selection.toggleSelected([id], ev.shiftKey)} */}
              {/*      /> */}
              {/*      <path */}
              {/*        d={path} */}
              {/*        fill='none' */}
              {/*        strokeWidth={1} */}
              {/*        className={mx(styles.edge, selection.contains(id) && styles.edgeSelected)} */}
              {/*        // TODO(burdon): Edge style. */}
              {/*        markerStart={id !== 'link' ? 'url(#circle)' : ''} */}
              {/*        markerEnd={id !== 'link' ? 'url(#circle)' : ''} */}
              {/*      /> */}
              {/*    </g> */}
              {/*  ))} */}
              {/* </g> */}

              {/* Debugging. */}
              {debugSelectionBounds && (
                <g>
                  <rect {...debugSelectionBounds} fill='none' strokeWidth={4} className='stroke-red-500' />
                </g>
              )}
            </g>
          </svg>

          {/* HTML content. */}
          <div {...testId('dx-html-content')}>
            {graph.nodes.map(({ data: item }) => (
              <div className={mx('absolute')} style={transformStyles} key={item.id}>
                <Frame
                  item={item}
                  scale={scale}
                  selected={selection.contains(item.id)}
                  onSelect={(id, shift) => selection.toggleSelected([id], shift)}
                />
              </div>
            ))}
            {edges.map(({ id, path }) => (
              <div className={mx('absolute')} style={transformStyles} key={id}>
                <svg width='100%' height='100%' __className={mx('absolute top-0 left-0')}>
                  <defs>
                    <Markers />
                  </defs>
                  <g key={id}>
                    {/* Hit area. */}
                    <path
                      d={path}
                      fill='none'
                      strokeWidth={8}
                      className={'stroke-transparent'}
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
        </>
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
