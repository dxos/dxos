//
// Copyright 2024 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { range } from '@dxos/util';

import { Frame, type FrameProps } from './Frame';
import { createPathThroughPoints, type Item } from './types';

// TODO(burdon): Focus
//  - ECHO query/editor.
//  - Basic UML (internal use).
//  - Basic processing pipeline (AI).

// TODO(burdon): Graph editor.
//  - Nodes as objects; with schema, incl. references.
//  - Drag/zoom background.
//  - Drag handle to create new node (in layer).
//  - Resize.
//  - Display form for selected node in sidebar.
//  - Grid (layer) on/off.
//  - Snap and highlight snap points while dragging.
//  - Group/collapse nodes; hierarchical editor.
//  - Inline edit.
//  - Generate UML from code.
//  - Grid options.
//  - Line options (1-to-many, inherits, etc.)
//  - Select multiple nodes.
//  - Delete/undo.

export type GridProps = {};

const round = (n: number, m: number) => Math.round(n / m) * m;

/**
 * Layout.
 */
export const Grid = (props: GridProps) => {
  // TODO(burdon): Graph data structure.
  const grid = 160;
  const snap = true;
  const [items, setItems] = useState<Item[]>(() =>
    range(8).map((_, i) => ({
      id: `item-${i + 1}`,
      pos: { x: round(100 + Math.random() * 800, grid), y: round(100 + Math.random() * 300, grid) },
      size: { width: 80, height: 80 },
    })),
  );

  // Drop target.
  const { ref, width, height } = useResizeDetector();
  const [isDraggedOver, setIsDraggedOver] = useState(false);
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
        setIsDraggedOver(false);
      },
    });
  }, [ref.current]);

  // Dragging connector.
  const [points, setPoints] = useState(items.map((item) => item.pos));
  const pathData = useMemo(() => createPathThroughPoints(points), [points]);
  const handleMove = useCallback<NonNullable<FrameProps['onMove']>>(
    (item, pos, state) => {
      if (state === 'drop') {
        item.pos = snap ? { x: round(pos.x, grid), y: round(pos.y, grid) } : pos;
        setItems((items) => [...items]);
        setPoints(items.map((i) => i.pos));
      } else {
        setPoints(items.map((i) => (i.id === item.id ? pos : i.pos)));
      }
    },
    [items],
  );

  return (
    <div ref={ref} className='flex grow relative'>
      <div>
        {items.map((item) => (
          <Frame key={item.id} item={item} onMove={handleMove} />
        ))}
      </div>
      <div>
        <svg width={width} height={height}>
          <g>
            <path d={pathData} fill='none' strokeWidth='1' className='stroke-blue-500' />
          </g>
        </svg>
      </div>
    </div>
  );
};
