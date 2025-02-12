//
// Copyright 2025 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
// import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { centerUnderPointer } from '@atlaskit/pragmatic-drag-and-drop/element/center-under-pointer';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { useState, useRef, useEffect, type FC, type SVGProps } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useBoardContext } from './context';
import { type Location } from './types';
import { type DOMRectBounds } from './util';

export type PieceProps = ThemedClassName<{
  location: Location;
  pieceType: string;
  bounds: DOMRectBounds;
  label?: string;
  transition?: boolean;
  Component: FC<SVGProps<SVGSVGElement>>;
}>;

export const Piece = ({ classNames, location, pieceType, bounds, label, transition, Component }: PieceProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<HTMLElement>();
  const [dragging, setDragging] = useState(false);
  const { dragging: isDragging } = useBoardContext();

  // useTrackProps({ classNames, location, pieceType, bounds, label, transition }, 'Piece');

  useEffect(() => {
    const el = ref.current;
    invariant(el);

    return draggable({
      element: el,
      getInitialData: () => ({ location, pieceType }),
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
      // TODO(burdon): Check size.
      canDrag: () => true,
      onDragStart: () => setDragging(true),
      onDrop: () => setDragging(false),
    });
  }, [location, pieceType]);

  // Make sure only applied once.
  // TODO(burdon): Sometimes jumps without animation.
  useEffect(() => {
    ref.current!.style.top = bounds.top + 'px';
    ref.current!.style.left = bounds.left + 'px';
    ref.current!.style.width = bounds.width + 'px';
    ref.current!.style.height = bounds.height + 'px';
  }, [bounds]);

  return (
    <>
      <div
        ref={ref}
        className={mx(
          'absolute flex justify-center items-center',
          classNames,
          transition && 'transition-[top,left] duration-300 ease-in-out',
          dragging && 'opacity-20', // Must not unmount component while dragging.
          isDragging && 'pointer-events-none', // Don't block the square's drop target.
        )}
      >
        <Component className={mx('w-full h-full')} />
        {label && <div className='absolute inset-1 text-xs text-black'>{label}</div>}
      </div>

      {preview &&
        createPortal(
          <div className={mx('absolute flex justify-center items-center', classNames)}>
            <Component className={mx('w-full h-full')} />
          </div>,
          preview,
        )}
    </>
  );
};
