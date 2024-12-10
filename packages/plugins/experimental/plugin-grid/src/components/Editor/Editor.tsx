//
// Copyright 2024 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useCallback, useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { range } from '@dxos/util';

import { Frame, type FrameProps, type Item } from './Frame';
import { createPathThroughPoints, createSnap, type Dimension, type Point, type PointTransform } from './geometry';
import { type Graph, GraphWrapper, type Node } from './graph';

// TODO(burdon): Focus
//  - ECHO query/editor.
//  - Basic UML (internal use; generate from GH via function).
//  - Basic processing pipeline (AI).

// TODO(burdon): Phase 1: Basic plugin.
//  - Link vs. create.
//  - Drag placeholder.
//  - Pan/zoom background.
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

const createId = () => Math.random().toString(36).slice(2, 10);
const createGraph = (snap: PointTransform): Graph<Node<Item>> => {
  const wrapper = new GraphWrapper<Node<Item>>();
  range(1).forEach((i) => {
    const id = createId();
    wrapper.addNode({
      id,
      data: {
        id,
        pos: snap({ x: 0, y: 0 }),
        size: itemSize,
      },
    });
  });

  return wrapper.graph;
};

/**
 * Layout.
 */
export const Editor = (props: EditorProps) => {
  const snap = createSnap({ width: 128 + 64, height: 64 + 64 });
  const [graph] = useState(new GraphWrapper<Node<Item>>(createGraph(snap)));

  // Drop target.
  const { ref, width = 0, height = 0 } = useResizeDetector();

  // Transform center.
  const style = {
    // transform: `matrix(1, 0, 0, 1, ${width / 2}, ${height / 2})`,
    // transform: `scale(1) translate(${width / 2}px, ${height / 2}px)`,
    transform: `translate(${width / 2}px, ${height / 2}px)`,
  };

  // Dragging state.
  // const [isDraggedOver, setIsDraggedOver] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    return dropTargetForElements({
      element: el,
      // onDragEnter: () => setIsDraggedOver(true),
      // onDragLeave: () => setIsDraggedOver(false),
      onDrop: ({ source }) => {
        // setIsDraggedOver(false);
      },
    });
  }, [ref.current]);

  const [linking, setLinking] = useState<{ source: Point; target: Point }>();
  const [dragging, setDragging] = useState<{ id: string; pos: Point }>();

  const handleMove = useCallback<NonNullable<FrameProps['onMove']>>(
    (item, pos, state) => {
      if (state === 'drop') {
        item.pos = snap(pos);
        setDragging(undefined);
      } else {
        setDragging({ id: item.id, pos });
      }
    },
    [graph],
  );

  const handleHandleMove = useCallback<NonNullable<FrameProps['onHandleMove']>>(
    (item, handle, pos, state) => {
      if (state === 'drop') {
        const id = createId();
        graph.addNode({ id, data: { id, pos: snap(pos), size: itemSize } });
        graph.addEdge({ id: createId(), source: item.id, target: id, data: {} });
        setLinking(undefined);
      } else {
        setLinking({ source: item.pos, target: pos });
      }
    },
    [graph],
  );

  const edges = graph.edges.map(({ id, source, target }) => {
    const getPos = (id: string) => (dragging?.id === id ? dragging.pos : graph.getNode(id)!.data.pos);
    return { id, path: createPathThroughPoints([getPos(source), getPos(target)]) };
  });

  if (linking) {
    edges.push({ id: 'link', path: createPathThroughPoints([linking.source, linking.target]) });
  }

  return (
    <div ref={ref} className='flex grow relative'>
      {/* HTML content. */}
      <div style={style}>
        {graph.nodes.map(({ data: item }) => (
          <Frame key={item.id} item={item} onMove={handleMove} onHandleMove={handleHandleMove} />
        ))}
      </div>

      {/* SVG content. */}
      <svg width='100%' height='100%' viewBox={`0 0 ${width} ${height}`} className='pointer-events-none touch-none'>
        <g style={style}>
          <Grid width={width} height={height} />

          {/* Edges */}
          {edges.map(({ id, path }) => (
            <path key={id} d={path} fill='none' strokeWidth='1' className='stroke-blue-500' />
          ))}
        </g>
      </svg>
    </div>
  );
};

const Grid = ({ width, height }: Dimension) => {
  return (
    <>
      {/* NOTE: Pattern needs to be offset so that the middle of the pattern aligns with the grid. */}
      <defs>
        <pattern id='grid_lines' width={16} height={16} patternUnits='userSpaceOnUse'>
          <line x1={0} y1={8} x2={16} y2={8} stroke='#888' />
          <line x1={8} y1={0} x2={8} y2={16} stroke='#888' />
        </pattern>
        <pattern id='grid_dot' width={16} height={16} patternUnits='userSpaceOnUse'>
          <circle cx={8} cy={8} r={0.5} stroke='#888' />
        </pattern>
      </defs>

      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill='url(#grid_lines)'
        style={{ transform: 'translate(-8px, -8px)' }}
        opacity={0.2}
      />
    </>
  );
};
