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
import { type Location, type Player } from './types';
import { type DOMRectBounds } from './util';

export type PieceProps = ThemedClassName<{
  location: Location;
  pieceType: string;
  orientation?: Player;
  bounds: DOMRectBounds;
  label?: string;
  animate?: boolean;
  Component: FC<SVGProps<SVGSVGElement>>;
}>;

export const Piece = memo(
  ({ classNames, location, pieceType, orientation, bounds, label, animate, Component }: PieceProps) => {
    useTrackProps(
      { classNames, location, pieceType, orientation, bounds, label, animate, Component },
      Piece.displayName,
      false,
    );

    const { dragging: isDragging } = useBoardContext();
    const [dragging, setDragging] = useState(false);
    const [preview, setPreview] = useState<HTMLElement>();

    const ref = useRef<HTMLDivElement>(null);
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
        // TODO(burdon): Check side.
        canDrag: () => true,
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
      });
    }, [location, pieceType]);

    // useEffect(() => {
    //   console.log('bounds', { bounds });
    //   ref.current!.style.width = bounds.width + 'px';
    //   ref.current!.style.height = bounds.height + 'px';
    //   ref.current!.style.transform = `translate3d(${bounds.left}px, ${bounds.top}px, 0)`;
    //   ref.current!.style.transition = 'transform 0.5s ease-in-out';
    // }, [bounds]);

    return (
      <>
        <div
          ref={ref}
          // TODO(burdon): This break DND.
          // style={{
          //   width: bounds.width,
          //   height: bounds.height,
          //   transform: `translate3d(${bounds.left}px, ${bounds.top}px, 0)`,
          // }}
          style={bounds}
          className={mx(
            'absolute',
            classNames,
            // animate && 'transition-transform duration-500 ease-in-out',
            animate && 'transition-[top,left] duration-500 ease-in-out',
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
  },
);

Piece.displayName = 'Piece';
