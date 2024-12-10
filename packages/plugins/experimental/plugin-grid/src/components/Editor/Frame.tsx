//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/react-ui-theme';

import { addPoint, type Dimension, getPoint, getPositionStyle, type Point } from './geometry';

const handleSize: Dimension = { width: 11, height: 11 };

/**
 * Graph data item.
 */
export type Item = {
  id: string;
  pos: Point;
  size: Dimension;
};

export type HandleProps = {
  id: string;
  pos: Point;
  onMove?: (id: string, pos: Point, state: 'drag' | 'drop') => void;
};

/**
 * Drag handle.
 */
export const Handle = ({ id, pos, onMove }: HandleProps) => {
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    invariant(el);
    return draggable({
      element: el,
      getInitialData: () => ({}),
      onDragStart: () => setDragging(true),
      onDrag: ({ location }) => {
        setDragging(false);
        onMove?.(id, getPoint(pos, location), 'drag');
      },
      onDrop: ({ location }) => {
        setDragging(false);
        onMove?.(id, getPoint(pos, location), 'drop');
      },
    });
  }, []);

  return (
    <div
      ref={ref}
      style={getPositionStyle(pos, handleSize)}
      className={mx('absolute z-10 border border-primary-500 bg-black', hovering && 'bg-blue-500')}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    />
  );
};

export type FrameProps = {
  item: Item;
  onMove?: (item: Item, pos: Point, state: 'drag' | 'drop') => void;
  onHandleMove?: (item: Item, handle: string, pos: Point, state: 'drag' | 'drop') => void;
};

/**
 * Draggable Frame.
 */
export const Frame = ({ item, onMove, onHandleMove }: FrameProps) => {
  const [dragging, setDragging] = useState(false);
  // const [hovering, setHovering] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    invariant(el);
    return draggable({
      element: el,
      getInitialData: () => ({ item }),
      onDragStart: () => setDragging(true),
      onDrag: ({ location }) => {
        onMove?.(item, getPoint(item.pos, location), 'drag');
      },
      onDrop: ({ location }) => {
        setDragging(false);
        onMove?.(item, getPoint(item.pos, location), 'drop');
      },
    });
  }, [item]);

  const handleHandleMove: HandleProps['onMove'] = (...props) => onHandleMove?.(item, ...props);

  // TODO(burdon): Surface for form content.
  //  return <Surface ref={forwardRef} role='card' limit={1} data={{ content: object} />;

  return (
    <>
      <div
        ref={ref}
        style={getPositionStyle(item.pos, item.size)}
        className={mx(
          'absolute flex justify-center items-center',
          'bg-black border border-blue-500 rounded overflow-hidden',
          dragging && 'hidden',
        )}
        // onMouseEnter={() => setHovering(true)}
        // onMouseLeave={() => setHovering(false)}
      >
        <div className='text-subdued truncate'>{item.id}</div>
      </div>
      {!dragging && (
        <>
          <Handle id='w' onMove={handleHandleMove} pos={addPoint(item.pos, { x: -item.size.width / 2, y: 0 })} />
          <Handle id='e' onMove={handleHandleMove} pos={addPoint(item.pos, { x: item.size.width / 2, y: 0 })} />
          <Handle id='n' onMove={handleHandleMove} pos={addPoint(item.pos, { x: 0, y: item.size.height / 2 })} />
          <Handle id='s' onMove={handleHandleMove} pos={addPoint(item.pos, { x: 0, y: -item.size.height / 2 })} />
        </>
      )}
    </>
  );
};
