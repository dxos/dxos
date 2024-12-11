//
// Copyright 2024 DXOS.org
//

import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/react-ui-theme';

import { pointAdd, type Dimension, getBoundsProperties, type Point } from './geometry';

const handleSize: Dimension = { width: 11, height: 11 };

const getPoint = (pos: Point, { initial, current }: DragLocationHistory): Point => ({
  x: current.input.clientX - (initial.input.clientX - pos.x),
  y: current.input.clientY - (initial.input.clientY - pos.y),
});

/**
 * Graph data item.
 */
export type Item = {
  id: string;
  pos: Point;
  size: Dimension;
};

export type HandleDragEvent = {
  type: 'drag' | 'drop';
  id: string;
  pos: Point;
  link?: Item;
};

export type HandleProps = {
  id: string;
  pos: Point;
  onDrag?: (event: HandleDragEvent) => void;
};

/**
 * Drag handle.
 */
export const Handle = ({ id, pos, onDrag }: HandleProps) => {
  // const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    invariant(el);
    return draggable({
      element: el,
      getInitialData: () => ({}),
      // onDragStart: () => setDragging(true),
      onDrag: ({ location }) => {
        // setDragging(false);
        onDrag?.({ type: 'drag', id, pos: getPoint(pos, location) });
      },
      onDrop: ({ location }) => {
        // setDragging(false);
        const link = location.current.dropTargets.find(({ data }) => data.type === 'Frame')?.data.item as Item;
        onDrag?.({ type: 'drop', id, pos: getPoint(pos, location), link });
      },
    });
  }, [pos, onDrag]);

  return (
    <div
      ref={ref}
      style={getBoundsProperties({ ...pos, ...handleSize })}
      className={mx('absolute z-10 bg-black border border-teal-700', hovering && 'bg-teal-700')}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    />
  );
};

export type FrameDragEvent = {
  type: 'drag' | 'drop';
  item: Item;
  pos: Point;
};

export type FrameLinkEvent = {
  type: 'drag' | 'drop';
  item: Item;
  pos: Point;
  link?: Item;
};

export type FrameProps = {
  item: Item;
  selected?: boolean;
  onSelect?: (item: Item, selected: boolean) => void;
  onDrag?: (event: FrameDragEvent) => void;
  onLink?: (event: FrameLinkEvent) => void;
};

/**
 * Draggable Frame.
 */
export const Frame = ({ item, selected, onSelect, onDrag, onLink }: FrameProps) => {
  const [dragging, setDragging] = useState(false);
  // const [hovering, setHovering] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  // Dragging.
  useEffect(() => {
    invariant(ref.current);
    return draggable({
      element: ref.current,
      getInitialData: () => ({ item }),
      onDragStart: () => setDragging(true),
      onDrag: ({ location }) => {
        onDrag?.({ type: 'drag', item, pos: getPoint(item.pos, location) });
      },
      onDrop: ({ location }) => {
        onDrag?.({ type: 'drop', item, pos: getPoint(item.pos, location) });
        setDragging(false);
      },
    });
  }, [item]);

  // Dropping (for link handles).
  useEffect(() => {
    invariant(ref.current);
    return dropTargetForElements({
      element: ref.current,
      getData: () => ({ type: 'Frame', item }),
      // onDragEnter: () => setIsDraggedOver(true),
      // onDragLeave: () => setIsDraggedOver(false),
      onDrop: ({ source }) => {
        // setIsDraggedOver(false);
      },
    });
  });

  const handleDrag = useCallback<NonNullable<HandleProps['onDrag']>>(
    ({ type, link, pos }) => onLink?.({ type, item, link, pos }),
    [item],
  );

  // TODO(burdon): Surface for form content.
  //  return <Surface ref={forwardRef} role='card' limit={1} data={{ content: object} />;

  return (
    <>
      <div
        ref={ref}
        style={getBoundsProperties({ ...item.pos, ...item.size })}
        onClick={() => onSelect?.(item, !selected)}
        className={mx(
          'absolute flex justify-center items-center',
          'bg-black border border-teal-700 rounded overflow-hidden',
          selected && 'bg-neutral-500',
          dragging && 'hidden',
        )}
        // onMouseEnter={() => setHovering(true)}
        // onMouseLeave={() => setHovering(false)}
      >
        <div className='text-subdued truncate'>{item.id}</div>
      </div>
      {!dragging && (
        <>
          <Handle id='w' onDrag={handleDrag} pos={pointAdd(item.pos, { x: -item.size.width / 2, y: 0 })} />
          <Handle id='e' onDrag={handleDrag} pos={pointAdd(item.pos, { x: item.size.width / 2, y: 0 })} />
          <Handle id='n' onDrag={handleDrag} pos={pointAdd(item.pos, { x: 0, y: item.size.height / 2 })} />
          <Handle id='s' onDrag={handleDrag} pos={pointAdd(item.pos, { x: 0, y: -item.size.height / 2 })} />
        </>
      )}
    </>
  );
};
