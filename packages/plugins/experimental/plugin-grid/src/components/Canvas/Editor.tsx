//
// Copyright 2024 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useResizeDetector } from 'react-resize-detector';

import { useDynamicRef } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { isNotFalsy } from '@dxos/util';

import { Frame, FrameDragPreview, type FrameProps } from './Frame';
import { useBoundingSelection } from './hooks';
import { GraphWrapper } from '../../graph';
import { useCanvasContext } from '../../hooks';
import {
  boundsContain,
  boundsToModel,
  createPathThroughPoints,
  createSnap,
  getInputPoint,
  type Bounds,
  type Dimension,
  type Point,
} from '../../layout';
import { createGraph, createId } from '../../testing';
import { Grid } from '../Grid';
import { Toolbar, type ToolbarProps } from '../Toolbar';

const itemSize: Dimension = { width: 128, height: 64 };

export type EditorProps = {};

// TODO(burdon): Rename Canvas.
export const Editor = (_: EditorProps) => {
  const { debug, showGrid, snapToGrid, dragging, handleAction: handleDefaultAction } = useCanvasContext();
  const snapPoint = createSnap({ width: itemSize.width + 64, height: itemSize.height + 64 });
  const [graph] = useState(() => new GraphWrapper(createGraph(itemSize, snapPoint)));
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector();

  // TODO(burdon): Replace with context state.
  const [itemDragging, setItemDragging] = useState<{ id: string; pos: Point }>();
  const [itemLinking, setItemLinking] = useState<{ source: Point; target: Point }>();

  // Selection.
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedRef = useDynamicRef(selected);

  //
  // Offset and scale.
  //
  const [{ scale, offset }, setTransform] = useState<{ scale: number; offset: Point }>({
    scale: 1,
    offset: { x: 0, y: 0 },
  });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (width && height) {
      setReady(true);
    }

    setTransform(({ scale }) => ({ scale, offset: { x: width / 2, y: height / 2 } }));
  }, [width, height]);
  const transformStyle = {
    // NOTE: Order is important.
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
  };

  //
  // Dragging state.
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
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey) {
        setTransform(({ scale, offset }) => {
          const scaleSensitivity = 0.01;
          const newScale = scale * Math.exp(-event.deltaY * scaleSensitivity);

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
        setTransform(({ offset: { x, y }, scale }) => ({
          offset: { x: x - event.deltaX, y: y - event.deltaY },
          scale,
        }));
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Backspace': {
          handleAction({ type: 'delete', ids: Object.keys(selectedRef?.current) });
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
  }, [containerRef, selectedRef, width, height]);

  //
  // Cursor/overlay.
  //
  const overlaySvgRef = useRef<SVGSVGElement>(null);
  const handleSelectionBounds = useCallback(
    (bounds: Bounds | null) => {
      if (!bounds) {
        setSelected({});
        return;
      }

      // Map the pointer event to the SVG coordinate system.
      const selection = boundsToModel(containerRef.current!.getBoundingClientRect(), scale, offset, bounds);
      const selected = graph.nodes.filter(
        ({ data: { pos } }) => boundsContain(selection, { ...pos, width: 0, height: 0 }), // Check center point.
      );
      setSelected(selected.reduce((acc, { data: { id } }) => ({ ...acc, [id]: true }), {}));
    },
    [overlaySvgRef, scale, offset],
  );

  const selectionBounds = useBoundingSelection(overlaySvgRef.current, handleSelectionBounds);
  const debugSelectionBounds =
    debug &&
    selectionBounds &&
    boundsToModel(overlaySvgRef.current!.getBoundingClientRect(), scale, offset, selectionBounds);

  const handleDrag = useCallback<NonNullable<FrameProps['onDrag']>>(
    ({ type, item, location }) => {
      const rect = overlaySvgRef.current!.getBoundingClientRect();
      const pos = boundsToModel(rect, scale, offset, getInputPoint(location.current.input));
      // const pos = boundsToModelWithOffset(rect, scale, offset, location, item.pos);
      if (type === 'drop') {
        item.pos = snapToGrid ? snapPoint(pos) : pos;
        setItemDragging(undefined);
      } else {
        setItemDragging({ id: item.id, pos });
      }
    },
    [overlaySvgRef, graph, snapToGrid, scale, offset],
  );

  const handleLink = useCallback<NonNullable<FrameProps['onLink']>>(
    ({ type, item, link, location }) => {
      const rect = overlaySvgRef.current!.getBoundingClientRect();
      const pos = boundsToModel(rect, scale, offset, getInputPoint(location.current.input));
      if (type === 'drop') {
        let id = link?.id;
        if (!id) {
          id = createId();
          graph.addNode({ id, data: { id, pos: snapToGrid ? snapPoint(pos) : pos, size: itemSize } });
        }
        graph.addEdge({ id: createId(), source: item.id, target: id, data: {} });
        setItemLinking(undefined);
      } else {
        setItemLinking({ source: item.pos, target: pos });
      }
    },
    [overlaySvgRef, graph, snapToGrid, scale, offset],
  );

  // TODO(burdon): SHIFT select to toggle.
  const handleSelect = useCallback<NonNullable<FrameProps['onSelect']>>((item, selected) => {
    if (selected) {
      setSelected((selected) => ({ ...selected, [item.id]: true }));
    } else {
      setSelected((selected) => {
        const { [item.id]: _, ...rest } = selected;
        return rest;
      });
    }
  }, []);

  //
  // Actions
  //
  // TODO(burdon): Undo.
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
          break;
        }
        case 'zoom-in': {
          setTransform({ offset: { x: width / 2, y: height / 2 }, scale: scale * 1.5 });
          break;
        }
        case 'zoom-out': {
          setTransform({ offset: { x: width / 2, y: height / 2 }, scale: scale / 1.5 });
          break;
        }

        case 'create': {
          const id = createId();
          graph.addNode({ id, data: { id, pos: { x: 0, y: 0 }, size: itemSize } });
          setSelected({});
          break;
        }
        case 'delete': {
          const { ids } = action;
          ids.forEach((id) => graph.removeNode(id));
          setSelected({});
          break;
        }
      }
    },
    [handleDefaultAction, graph, scale, width, height],
  );

  // Create edges.
  const edges = graph.edges
    .map(({ id, source, target }) => {
      const getPos = (id: string) => (itemDragging?.id === id ? itemDragging.pos : graph.getNode(id)?.data.pos);
      const p1 = getPos(source);
      const p2 = getPos(target);
      if (!p1 || !p2) {
        return null;
      }

      return { id, path: createPathThroughPoints([p1, p2]) };
    })
    .filter(isNotFalsy);
  if (itemLinking) {
    edges.push({ id: 'link', path: createPathThroughPoints([itemLinking.source, itemLinking.target]) });
  }

  return (
    <div role='none' ref={containerRef} tabIndex={0} className='flex grow relative overflow-hidden'>
      {/* Grid. */}
      {ready && showGrid && <Grid offset={offset} scale={scale} />}

      {/* SVG content. */}
      {ready && (
        <>
          {/* Selection overlay. */}
          {/* TODO(burdon): Currently HTML content needs to be last so that elements can be dragged. */}
          <svg width='100%' height='100%' className='absolute left-0 top-0 cursor-crosshair' ref={overlaySvgRef}>
            <g>
              {selectionBounds && (
                <rect {...selectionBounds} opacity={0.2} strokeWidth={2} className='stroke-blue-500' />
              )}
            </g>
          </svg>

          {/* SVG content. */}
          <svg width='100%' height='100%' className='absolute left-0 top-0 pointer-events-none touch-none'>
            <g style={transformStyle}>
              {/* Edges. */}
              <g>
                {edges.map(({ id, path }) => (
                  <path key={id} d={path} fill='none' strokeWidth='1' className='stroke-teal-700' />
                ))}
              </g>

              {/* Debugging. */}
              {debugSelectionBounds && (
                <g>
                  <rect {...debugSelectionBounds} fill='none' strokeWidth={4} className='stroke-red-500' />
                </g>
              )}
            </g>
          </svg>

          {/* HTML content. */}
          <div style={transformStyle} className='absolute left-0 top-0'>
            {graph.nodes.map(({ data: item }) => (
              <Frame
                key={item.id}
                item={item}
                selected={selected[item.id]}
                onSelect={handleSelect}
                onDrag={handleDrag}
                onLink={handleLink}
              />
            ))}
          </div>

          {/* Drag preview. */}
          {dragging &&
            createPortal(
              <div style={transformStyle}>
                <FrameDragPreview item={dragging.item} />
              </div>,
              dragging.container,
            )}
        </>
      )}

      {/* UI. */}
      <div>
        <div className='fixed left-0 bottom-0 z-10'>
          <SyntaxHighlighter language='javascript' classNames='w-[300px] bg-base text-xs p-2 opacity-70'>
            {JSON.stringify(
              {
                debug,
                showGrid,
                snapToGrid,
                scale,
                offset,
                rect: overlaySvgRef.current?.getBoundingClientRect(),
                selectionBounds,
                transformedSelectionBounds: debugSelectionBounds,
                dragging: itemDragging,
                linking: itemLinking,
              },
              null,
              2,
            )}
          </SyntaxHighlighter>
        </div>
        <div className='fixed right-2 top-2 z-10'>
          <Toolbar onAction={handleAction} />
        </div>
      </div>
    </div>
  );
};
