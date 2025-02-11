//
// Copyright 2025 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
// import { centerUnderPointer } from '@atlaskit/pragmatic-drag-and-drop/element/center-under-pointer';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { useState, useRef, useEffect, type FC, type SVGProps } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type Location } from './types';
import { type DOMRectBounds } from './util';

export type PieceProps = ThemedClassName<{
  location: Location;
  pieceType: string;
  bounds: DOMRectBounds;
  Component: FC<SVGProps<SVGSVGElement>>;
}>;

export const Piece = ({ classNames, location, pieceType, bounds, Component }: PieceProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const [preview, setPreview] = useState<HTMLElement>();

  useEffect(() => {
    const el = ref.current;
    invariant(el);
    return draggable({
      element: el,
      getInitialData: () => ({ location, pieceType }),
      onGenerateDragPreview: ({ nativeSetDragImage, location, source }) => {
        log('onGenerateDragPreview', { source: source.data });
        setCustomNativeDragPreview({
          // getOffset: centerUnderPointer,
          getOffset: preserveOffsetOnSource({
            element: source.element,
            input: location.current.input,
          }),
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
      onDragStart: () => setDragging(true),
      onDrop: () => setDragging(false),
    });
  }, [location, pieceType]);

  return (
    <>
      <div
        ref={ref}
        className={mx('absolute flex justify-center items-center aspect-square', classNames, dragging && 'opacity-0')}
        style={bounds}
      >
        <Component className={mx('w-full h-full')} />
      </div>

      {preview &&
        createPortal(
          <div className={mx('absolute flex justify-center items-center aspect-square', classNames)}>
            <Component className={mx('w-full h-full')} />
          </div>,
          preview,
        )}
    </>
  );
};
