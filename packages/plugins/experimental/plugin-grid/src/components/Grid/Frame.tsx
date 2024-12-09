//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/react-ui-theme';

import { getPoint, getPositionStyle, type Item, type Point } from './types';

// TODO(burdon): Drag overlay.

export type FrameProps = {
  item: Item;
  onMove?: (item: Item, pos: Point, state: 'drag' | 'drop') => void;
};

/**
 * Draggable Frame.
 */
export const Frame = ({ item, onMove }: FrameProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
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

  // TODO(burdon): Surface for form content.
  //  return <Surface ref={forwardRef} role='card' limit={1} data={{ content: object} />;

  return (
    <div
      ref={ref}
      style={getPositionStyle(item.pos, item.size)}
      className={mx(
        'absolute flex justify-center items-center',
        'bg-black border border-blue-500 rounded overflow-hidden',
        dragging && 'hidden',
      )}
    >
      <div className='text-subdued truncate'>{item.id}</div>
    </div>
  );
};
