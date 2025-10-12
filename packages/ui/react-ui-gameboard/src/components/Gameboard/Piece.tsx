//
// Copyright 2025 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { centerUnderPointer } from '@atlaskit/pragmatic-drag-and-drop/element/center-under-pointer';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { type FC, type SVGProps, memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ThemedClassName, useDynamicRef } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useGameboardContext } from './Gameboard';
import { type Location, type PieceRecord, type Player, isEqualLocation, isLocation } from './types';
import { type DOMRectBounds } from './util';

export type PieceProps = ThemedClassName<{
  Component: FC<SVGProps<SVGSVGElement>>;
  piece: PieceRecord;
  bounds: DOMRectBounds;
  label?: string;
  orientation?: Player;
  onClick?: () => void;
}>;

export const Piece = memo(({ classNames, Component, piece, bounds, label, onClick }: PieceProps) => {
  const { model, dragging: isDragging, promoting } = useGameboardContext(Piece.displayName!);
  const promotingRef = useDynamicRef(promoting);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<HTMLElement>();

  // Current position.
  const [current, setCurrent] = useState<{ location?: Location; bounds?: DOMRectBounds }>({});

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!model) {
      return;
    }

    const el = ref.current;
    invariant(el);

    return draggable({
      element: el,
      getInitialData: () => ({ piece }),
      onGenerateDragPreview: ({ nativeSetDragImage, source }) => {
        log('onGenerateDragPreview', { source: source.data });
        setCustomNativeDragPreview({
          getOffset: centerUnderPointer,
          render: ({ container }) => {
            setPreview(container);
            const { width, height } = el.getBoundingClientRect();
            container.style.width = width + 'px';
            container.style.height = height + 'px';
            return () => {
              setPreview(undefined);
            };
          },
          nativeSetDragImage,
        });
      },
      canDrag: () => !promotingRef.current && !model.readonly && model.turn === piece.side,
      onDragStart: () => setDragging(true),
      onDrop: ({ location: { current } }) => {
        // TODO(burdon): Create wrapper function to catch errors.
        try {
          const location = current.dropTargets[0]?.data.location;
          if (isLocation(location)) {
            setCurrent((current) => ({ ...current, location }));
          }
        } catch {
          // Ignore.
        }

        setDragging(false);
      },
    });
  }, [model, piece]);

  // Must update position independently of render cycle (otherwise animation is interrupted).
  useEffect(() => {
    requestAnimationFrame(() => {
      if (!ref.current || !bounds) {
        return;
      }

      // Check if piece moved.
      if (!current.location || !isEqualLocation(current.location, piece.location)) {
        ref.current.style.transition = 'top 250ms ease-out, left 250ms ease-out';
        ref.current.style.top = bounds.top + 'px';
        ref.current.style.left = bounds.left + 'px';
        setCurrent({ location: piece.location, bounds });
      } else if (current.bounds !== bounds) {
        ref.current.style.transition = 'none';
        ref.current.style.top = bounds.top + 'px';
        ref.current.style.left = bounds.left + 'px';
        setCurrent({ location: piece.location, bounds });
      }
    });
  }, [current, piece.location, bounds]);

  return (
    <>
      <div
        ref={ref}
        style={{
          width: bounds?.width,
          height: bounds?.height,
        }}
        className={mx(
          'absolute',
          classNames,
          dragging && 'opacity-20', // Must not unmount component while dragging.
          isDragging && 'pointer-events-none', // Don't block the square's drop target.
        )}
        onClick={onClick}
      >
        <Component className='grow' />
        {label && <div className='absolute inset-1 text-xs text-black'>{label}</div>}
      </div>

      {preview &&
        createPortal(
          <div className={mx(classNames)}>
            <Component className='grow' />
          </div>,
          preview,
        )}
    </>
  );
});

Piece.displayName = 'Piece';
