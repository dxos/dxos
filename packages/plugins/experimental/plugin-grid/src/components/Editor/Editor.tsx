//
// Copyright 2024 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { useDynamicRef } from '@dxos/react-ui';
import { isNotFalsy } from '@dxos/util';

import { Frame, type FrameProps } from './Frame';
import { Grid } from './Grid';
import { Toolbar, type ToolbarProps } from './Toolbar';
import {
  createPathThroughPoints,
  createSnap,
  type Dimension,
  type Point,
  getRelativeCoordinates,
  boundsContain,
  type Bounds,
} from './geometry';
import { GraphWrapper } from './graph';
import { useBoundingSelection } from './hooks';
import { createGraph, createId } from './testing';

// TODO(burdon): Focus
//  - ECHO query/editor.
//  - Basic UML (internal use; generate from GH via function).
//  - Basic processing pipeline (AI).

// TODO(burdon): Phase 1: Basic plugin.
//  - Pan/zoom background.
//  - Selection.
//  - Flickers on first render (hide until ready).
//  - Link vs. create.
//  - Drag placeholder.
//  - Hide drag handles unless hovering.
//  - Nodes as objects.
//  - Surface/form storybook.
//  - Auto-layout (reconcile with plugin-debug).
//  - Basic theme.
//  - Factor out react-ui-xxx vs. plugin.

// TODO(burdon): Phase 2
//  - Resize frames.
//  - Group/collapse nodes; hierarchical editor.
//  - Inline edit.
//  - Grid options.
//  - Line options (1-to-many, inherits, etc.)
//  - Select multiple nodes.
//  - Delete/undo.

export type EditorProps = {};

const itemSize: Dimension = { width: 128, height: 64 };

/**
 * Layout.
 */
export const Editor = (props: EditorProps) => {
  const snap = createSnap({ width: itemSize.width + 64, height: itemSize.height + 64 });
  const [graph] = useState(() => new GraphWrapper(createGraph(snap, itemSize)));

  // Drop target.
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector();
  const ready = !!width && !!height;

  // Transform center.
  const scale = 1;
  const center = { x: width / 2, y: height / 2 };
  const transformStyle = {
    transform: `scale(${scale}) translate(${center.x}px, ${center.y}px)`,
  };

  // State.
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedRef = useDynamicRef(selected);

  const [linking, setLinking] = useState<{ source: Point; target: Point }>();

  const [dragging, setDragging] = useState<{ id: string; pos: Point }>();

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

  // Keys.
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Backspace': {
          handleDelete(Object.keys(selectedRef?.current));
          setSelected({});
          break;
        }
      }
    };

    containerRef.current.addEventListener('keydown', handleKeyDown);
    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, selectedRef]);

  // Selection.
  const svgRef = useRef<SVGSVGElement>(null);
  const callback = useCallback(
    (bounds: Bounds | null) => {
      if (!bounds) {
        setSelected({});
        return;
      }

      // Map the pointer event to the SVG coordinate system.
      const selection = getRelativeCoordinates(svgRef.current!.getBoundingClientRect(), scale, center, bounds);
      const selected = graph.nodes.filter(
        ({ data: { pos } }) => boundsContain(selection, { ...pos, width: 0, height: 0 }), // Check center point.
      );
      setSelected(selected.reduce((acc, { data: { id } }) => ({ ...acc, [id]: true }), {}));
    },
    [svgRef, scale, center],
  );
  const bounds = useBoundingSelection(svgRef.current, callback);

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

  const handleAction = useCallback<NonNullable<ToolbarProps['onAction']>>(
    ({ type }) => {
      switch (type) {
        case 'create': {
          const id = createId();
          graph.addNode({ id, data: { id, pos: { x: 0, y: 0 }, size: itemSize } });
          break;
        }
      }
    },
    [graph],
  );

  const handleDelete = useCallback(
    (ids: string[]) => {
      ids.forEach((id) => graph.removeNode(id));
    },
    [graph],
  );

  const handleDrag = useCallback<NonNullable<FrameProps['onDrag']>>(
    ({ type, item, pos }) => {
      if (type === 'drop') {
        item.pos = snap(pos);
        setDragging(undefined);
      } else {
        setDragging({ id: item.id, pos });
      }
    },
    [graph],
  );

  const handleLink = useCallback<NonNullable<FrameProps['onLink']>>(
    ({ type, item, link, pos }) => {
      if (type === 'drop') {
        let id = link?.id;
        if (!id) {
          id = createId();
          graph.addNode({ id, data: { id, pos: snap(pos), size: itemSize } });
        }
        graph.addEdge({ id: createId(), source: item.id, target: id, data: {} });
        setLinking(undefined);
      } else {
        setLinking({ source: item.pos, target: pos });
      }
    },
    [graph],
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

  // TODO(burdon): Currently HTML content needs to be last so that elements can be dragged.
  return (
    <div ref={containerRef} tabIndex={0} className='flex grow relative'>
      {/* SVG content. */}
      <svg
        width='100%'
        height='100%'
        viewBox={`0 0 ${width} ${height}`}
        className='absolute inset-0 pointer-events-none touch-none'
      >
        <g style={transformStyle}>
          <Grid width={width} height={height} />

          {/* Edges */}
          {ready &&
            edges.map(({ id, path }) => (
              <path key={id} d={path} fill='none' strokeWidth='1' className='stroke-teal-700' />
            ))}
        </g>
      </svg>

      {/* Toolbar. */}
      <div className='absolute right-0 bottom-0 z-10'>
        <Toolbar onAction={handleAction} />
      </div>

      {/* Selection overlay. */}
      <svg ref={svgRef} width='100%' height='100%' className='absolute inset-0'>
        <g>{bounds && <rect {...bounds} fill='none' strokeWidth='2' className='stroke-blue-500' />}</g>
      </svg>

      {/* HTML content. */}
      <div style={transformStyle}>
        {ready &&
          graph.nodes.map(({ data: item }) => (
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
    </div>
  );
};
