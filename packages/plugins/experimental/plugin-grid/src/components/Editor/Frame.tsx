//
// Copyright 2024 DXOS.org
//

import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/react-ui-theme';

import { pointAdd, type Dimension, getBoundsProperties, type Point } from './geometry';

const handleSize: Dimension = { width: 11, height: 11 };

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
  link?: Item;
  location: DragLocationHistory;
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
        onDrag?.({ type: 'drag', id, location });
      },
      onDrop: ({ location }) => {
        // setDragging(false);
        const link = location.current.dropTargets.find(({ data }) => data.type === 'Frame')?.data.item as Item;
        onDrag?.({ type: 'drop', id, link, location });
      },
    });
  }, [pos, onDrag]);

  return (
    <div
      ref={ref}
      style={getBoundsProperties({ ...pos, ...handleSize })}
      className={mx('absolute z-10 bg-base border border-teal-700', hovering && 'bg-teal-700')}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    />
  );
};

export type FrameDragEvent = {
  type: 'drag' | 'drop';
  item: Item;
  location: DragLocationHistory;
};

// TODO(burdon): Combine events.
export type FrameLinkEvent = {
  type: 'drag' | 'drop';
  item: Item;
  link?: Item;
  location: DragLocationHistory;
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
        onDrag?.({ type: 'drag', item, location });
      },
      onDrop: ({ location }) => {
        onDrag?.({ type: 'drop', item, location });
        setDragging(false);
      },
    });
  }, [item, onDrag]);

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
    ({ type, link, location }) => onLink?.({ type, item, link, location }),
    [item, onLink],
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
          'bg-base border border-teal-700 rounded overflow-hidden',
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
