//
// Copyright 2024 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { useDynamicRef } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { isNotFalsy } from '@dxos/util';

import { Frame, type FrameProps } from './Frame';
import { Grid } from './Grid';
import { Toolbar, type ToolbarProps } from './Toolbar';
import {
  createPathThroughPoints,
  createSnap,
  type Dimension,
  type Point,
  boundsToModel,
  boundsContain,
  type Bounds,
  boundToModelWithOffset,
  getInputPoint,
} from './geometry';
import { GraphWrapper } from './graph';
import { useBoundingSelection } from './hooks';
import { createGraph, createId } from './testing';

// TODO(burdon): Focus
//  - ECHO query/editor.
//  - Basic UML (internal use; generate from GH via function).
//  - Basic processing pipeline (AI).

// TODO(burdon): Phase 1: Basic plugin.
//  - Nodes as objects.
//  - Surface/form storybook.
//  - Basic theme.
//  - Dragging placeholder.
//  - Hide drag handles unless hovering.
//  - Factor out react-ui-xxx vs. plugin.

// TODO(burdon): Phase 2
//  - Undo.
//  - Auto-layout (reconcile with plugin-debug).
//  - Resize frames.
//  - Group/collapse nodes; hierarchical editor.
//  - Inline edit.
//  - Grid options.
//  - Line options (1-to-many, inherits, etc.)
//  - Select multiple nodes.

export type EditorProps = {};

const itemSize: Dimension = { width: 128, height: 64 };

/**
 * Layout.
 */
export const Editor = (props: EditorProps) => {
  const snapPoint = createSnap({ width: itemSize.width + 64, height: itemSize.height + 64 });
  const [graph] = useState(() => new GraphWrapper(createGraph(snapPoint, itemSize)));

  // State.
  const [debug, setDebug] = useState(false);
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [dragging, setDragging] = useState<{ id: string; pos: Point }>();
  const [linking, setLinking] = useState<{ source: Point; target: Point }>();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedRef = useDynamicRef(selected);

  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector();
  const gridRef = useRef<SVGSVGElement>(null);
  const ready = !!width && !!height;

  //
  // Offset and scale.
  //
  const [{ offset, scale }, setTransform] = useState<{ offset: Point; scale: number }>({
    offset: { x: width / 2, y: height / 2 },
    scale: 1,
  });
  useEffect(() => setTransform(({ scale }) => ({ offset: { x: width / 2, y: height / 2 }, scale })), [width, height]);
  const transformStyle = {
    // NOTE: Order is important.
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
  };

  // Dragging state.
  // const [isDraggedOver, setIsDraggedOver] = useState(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    return dropTargetForElements({
      element: el,
      getData: () => ({ type: 'Canvas' }),
      // onDragEnter: () => setIsDraggedOver(true),
      // onDragLeave: () => setIsDraggedOver(false),
      onDrop: ({ source }) => {
        // setIsDraggedOver(false);
      },
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
        setTransform(({ offset, scale }) => {
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

          return { offset: newOffset, scale: newScale };
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
  // Curso/overlay.
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
  const transformedSelectionBounds =
    selectionBounds && boundsToModel(overlaySvgRef.current!.getBoundingClientRect(), scale, offset, selectionBounds);

  const handleDrag = useCallback<NonNullable<FrameProps['onDrag']>>(
    ({ type, item, location }) => {
      const pos = boundToModelWithOffset(
        overlaySvgRef.current!.getBoundingClientRect(),
        scale,
        offset,
        location,
        item.pos,
      );
      if (type === 'drop') {
        item.pos = snap ? snapPoint(pos) : pos;
        setDragging(undefined);
      } else {
        setDragging({ id: item.id, pos });
      }
    },
    [overlaySvgRef, graph, snap, scale, offset],
  );

  const handleLink = useCallback<NonNullable<FrameProps['onLink']>>(
    ({ type, item, link, location }) => {
      const pos = boundsToModel(
        overlaySvgRef.current!.getBoundingClientRect(),
        scale,
        offset,
        getInputPoint(location.current.input),
      );
      if (type === 'drop') {
        let id = link?.id;
        if (!id) {
          id = createId();
          graph.addNode({ id, data: { id, pos: snap ? snapPoint(pos) : pos, size: itemSize } });
        }
        graph.addEdge({ id: createId(), source: item.id, target: id, data: {} });
        setLinking(undefined);
      } else {
        setLinking({ source: item.pos, target: pos });
      }
    },
    [overlaySvgRef, graph, snap, scale, offset],
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
    (event) => {
      const { type } = event;
      switch (type) {
        case 'debug': {
          setDebug(!debug);
          break;
        }
        case 'grid': {
          setGrid(!grid);
          break;
        }
        case 'snap': {
          setSnap(!snap);
          break;
        }

        // TODO(burdon): Animate.
        case 'center': {
          setTransform({ offset: { x: width / 2, y: height / 2 }, scale: 1 });
          break;
        }

        // TODO(burdon): Keep centered.
        case 'zoom-in': {
          setTransform({ offset: { x: width / 2, y: height / 2 }, scale: scale * 2 });
          break;
        }
        case 'zoom-out': {
          setTransform({ offset: { x: width / 2, y: height / 2 }, scale: scale / 2 });
          break;
        }

        case 'create': {
          const id = createId();
          graph.addNode({ id, data: { id, pos: { x: 0, y: 0 }, size: itemSize } });
          setSelected({});
          break;
        }

        case 'delete': {
          const { ids } = event;
          ids.forEach((id) => graph.removeNode(id));
          setSelected({});
          break;
        }
      }
    },
    [graph, scale, width, height, debug, grid, snap],
  );

  // Create edges.
  const edges = graph.edges
    .map(({ id, source, target }) => {
      const getPos = (id: string) => (dragging?.id === id ? dragging.pos : graph.getNode(id)?.data.pos);
      const p1 = getPos(source);
      const p2 = getPos(target);
      if (!p1 || !p2) {
        return null;
      }

      return { id, path: createPathThroughPoints([p1, p2]) };
    })
    .filter(isNotFalsy);
  if (linking) {
    edges.push({ id: 'link', path: createPathThroughPoints([linking.source, linking.target]) });
  }

  return (
    <div ref={containerRef} tabIndex={0} className='flex grow relative overflow-hidden'>
      {/* Grid. */}
      {grid && <Grid ref={gridRef} offset={offset} scale={scale} />}

      {/* SVG content. */}
      {ready && (
        <>
          {/* Selection overlay. */}
          {/* TODO(burdon): Currently HTML content needs to be last so that elements can be dragged. */}
          <svg width='100%' height='100%' className='absolute left-0 top-0' ref={overlaySvgRef}>
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

              {/* TODO(burdon): Transformation of overlay for debugging. */}
              {debug && transformedSelectionBounds && (
                <g>
                  <rect {...transformedSelectionBounds} fill='none' strokeWidth={4} className='stroke-red-500' />
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
        </>
      )}

      {/* UI. */}
      <div>
        <div className='fixed left-0 bottom-0 z-10'>
          <SyntaxHighlighter language='javascript' classNames='bg-base text-xs p-2'>
            {JSON.stringify(
              {
                debug,
                grid,
                snap,
                scale,
                offset,
                rect: overlaySvgRef.current?.getBoundingClientRect(),
                selectionBounds,
                transformedSelectionBounds,
                dragging,
                linking,
              },
              null,
              2,
            )}
          </SyntaxHighlighter>
        </div>
        <div className='fixed right-0 bottom-0 z-10'>
          <Toolbar onAction={handleAction} />
        </div>
      </div>
    </div>
  );
};
