//
// Copyright 2025 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
// import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { centerUnderPointer } from '@atlaskit/pragmatic-drag-and-drop/element/center-under-pointer';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { useState, useRef, useEffect, type FC, type SVGProps, memo } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { useTrackProps, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useBoardContext } from './context';
import { isEqualLocation, isLocation, type Location, type PieceRecord, type Player } from './types';
import { type DOMRectBounds } from './util';

export type PieceProps = ThemedClassName<{
  piece: PieceRecord;
  bounds: DOMRectBounds;
  label?: string;
  orientation?: Player;
  Component: FC<SVGProps<SVGSVGElement>>;
}>;

export const Piece = memo(({ classNames, piece, orientation, bounds, label, Component }: PieceProps) => {
  useTrackProps({ classNames, piece, orientation, bounds, label, Component }, Piece.displayName, false);
  const { model } = useBoardContext();

  const { dragging: isDragging } = useBoardContext();
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<HTMLElement>();

  // Current position.
  const [current, setCurrent] = useState<{ location?: Location; bounds?: DOMRectBounds }>({});

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    invariant(el);

    return draggable({
      element: el,
      getInitialData: () => ({ piece }),
      onGenerateDragPreview: ({ nativeSetDragImage, location, source }) => {
        log('onGenerateDragPreview', { source: source.data });
        setCustomNativeDragPreview({
          getOffset: centerUnderPointer,
          // getOffset: preserveOffsetOnSource({
          //   element: source.element,
          //   input: location.current.input,
          // }),
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
      canDrag: () => model?.turn === piece.side,
      onDragStart: () => setDragging(true),
      onDrop: ({ location }) => {
        const drop = location.current.dropTargets[0].data;
        const loc = drop.location;
        if (isLocation(loc)) {
          setCurrent((current) => ({ ...current, location: loc }));
        }
        setDragging(false);
      },
    });
  }, [model, piece]);

  // Update position independently of render cycle (otherwise animation is interrupted).
  useEffect(() => {
    requestAnimationFrame(() => {
      if (!ref.current || !bounds) {
        return;
      }

      // Check if piece moved.
      if (!current.location || !isEqualLocation(current.location, piece.location)) {
        ref.current.style.transition = 'top 400ms ease-out, left 400ms ease-out';
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
          // orientation === 'black' && '_rotate-180',
          dragging && 'opacity-20', // Must not unmount component while dragging.
          isDragging && 'pointer-events-none', // Don't block the square's drop target.
        )}
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
