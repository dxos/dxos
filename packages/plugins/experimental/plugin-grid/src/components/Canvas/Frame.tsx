//
// Copyright 2024 DXOS.org
//

import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import React, { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { Input } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { pointAdd, type Dimension, getBoundsProperties, type Point } from './geometry';
import { useCanvasContext } from '../../hooks';

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
  const [hovering, setHovering] = useState(false);

  // Dragging.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    invariant(el);
    return draggable({
      element: el,
      getInitialData: () => ({}),
      onDrag: ({ location }) => {
        onDrag?.({ type: 'drag', id, location });
      },
      onDrop: ({ location }) => {
        const link = location.current.dropTargets.find(({ data }) => data.type === 'Frame')?.data.item as Item;
        onDrag?.({ type: 'drop', id, link, location });
      },
    });
  }, [pos, onDrag]);

  return (
    <div
      ref={ref}
      style={getBoundsProperties({ ...pos, ...handleSize })}
      className={mx('absolute z-10 bg-base rounded border border-teal-700', hovering && 'bg-teal-700')}
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

// TODO(burdon): Combine event types?
export type FrameLinkEvent = {
  type: 'drag' | 'drop';
  item: Item;
  link?: Item;
  location: DragLocationHistory;
};

export type FrameProps = PropsWithChildren<{
  item: Item;
  selected?: boolean;
  onSelect?: (item: Item, selected: boolean) => void;
  onDrag?: (event: FrameDragEvent) => void;
  onLink?: (event: FrameLinkEvent) => void;
}>;

// TODO(burdon): Surface for form content. Or pass in children (which may include a Surface).
//  return <Surface ref={forwardRef} role='card' limit={1} data={{ content: object} />;

/**
 * Draggable Frame around shapes.
 */
export const Frame = ({ children, item, selected, onSelect, onDrag, onLink }: FrameProps) => {
  const { dragging, setDragging } = useCanvasContext();
  const isDragging = dragging?.item.id === item.id;

  const [hovering, setHovering] = useState(false);

  // Dragging.
  // TODO(burdon): Handle cursor dragging out of window (currently drop is lost/frozen).
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return draggable({
      element: ref.current,
      getInitialData: () => ({ item }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          // TODO(burdon): Calc offset.
          getOffset: ({ container }) => {
            return { x: item.size.width / 2, y: item.size.height / 2 };
          },
          render: ({ container }) => {
            setDragging({ item, container });
          },
        });
      },
      // TODO(burdon): Remove interim callbacks; use monitor?
      onDrag: ({ location }) => {
        onDrag?.({ type: 'drag', item, location });
      },
      onDrop: ({ location }) => {
        onDrag?.({ type: 'drop', item, location });
        setDragging(undefined);
      },
    });
  }, [item, onDrag]);

  // Dropping (for link handles).
  useEffect(() => {
    invariant(ref.current);
    return dropTargetForElements({
      element: ref.current,
      getData: () => ({ type: 'Frame', item }),
    });
  });

  // TODO(burdon): Manage state and handle visibility.
  const handleDrag = useCallback<NonNullable<HandleProps['onDrag']>>(
    ({ type, link, location }) => onLink?.({ type, item, link, location }),
    [item, onLink],
  );

  // TODO(burdon): Make shape pluggable, incl. style. Create TextShape as a child of the Frame.
  const editing = true;

  return (
    // NOTE: Cannot hide while dragging.
    <div role='none' className={mx(isDragging && 'opacity-0')}>
      <div
        ref={ref}
        style={getBoundsProperties({ ...item.pos, ...item.size })}
        onClick={() => onSelect?.(item, !selected)}
        className={mx(
          'absolute flex justify-center items-center',
          'bg-base border border-teal-700 rounded overflow-hidden',
          selected && 'bg-neutral-700',
        )}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setTimeout(() => setHovering(false), 100)}
      >
        {(editing && (
          <Input.Root>
            <Input.TextArea
              value={item.id}
              spellCheck={false}
              style={{ resize: 'none' }}
              classNames={'h-full text-center'}
            />
          </Input.Root>
        )) || <div className='text-subdued truncate'>{item.id}</div>}
      </div>

      {onLink && (
        <div>
          <Handle id='w' onDrag={handleDrag} pos={pointAdd(item.pos, { x: -item.size.width / 2, y: 0 })} />
          <Handle id='e' onDrag={handleDrag} pos={pointAdd(item.pos, { x: item.size.width / 2, y: 0 })} />
          <Handle id='n' onDrag={handleDrag} pos={pointAdd(item.pos, { x: 0, y: item.size.height / 2 })} />
          <Handle id='s' onDrag={handleDrag} pos={pointAdd(item.pos, { x: 0, y: -item.size.height / 2 })} />
        </div>
      )}
    </div>
  );
};

// TODO(burdon): Factor out common structure.
export const FrameDragPreview = ({ item }: FrameProps) => {
  return (
    <div
      style={getBoundsProperties({ ...item.pos, ...item.size })}
      className={mx(
        'absolute flex justify-center items-center',
        'bg-base border border-teal-700 rounded overflow-hidden',
      )}
    >
      <div className='text-subdued truncate'>{item.id}</div>
    </div>
  );
};
