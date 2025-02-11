//
// Copyright 2025 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { useState, useRef, useEffect, type FC, type SVGProps } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { mx } from '@dxos/react-ui-theme';

import { type Coord } from './types';
import { type DOMRectBounds } from './util';

export type PieceProps = {
  location: Coord;
  pieceType: string;
  bounds: DOMRectBounds;
  Component: FC<SVGProps<SVGSVGElement>>;
};

export const Piece = ({ location, pieceType, bounds, Component }: PieceProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const [preview, setPreview] = useState<HTMLElement>();

  useEffect(() => {
    const el = ref.current;
    invariant(el);
    return draggable({
      element: el,
      getInitialData: () => ({ location, pieceType }),
      onGenerateDragPreview: ({ nativeSetDragImage, source }) => {
        log.info('onGenerateDragPreview', { source: source.data });
        setCustomNativeDragPreview({
          getOffset: () => {
            const { width, height } = el.getBoundingClientRect();
            return {
              x: width / 2,
              y: height / 2,
            };
          },
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
      {!dragging && (
        <div ref={ref} className={'absolute flex justify-center items-center aspect-square'} style={bounds}>
          <Component className={mx('w-full h-full')} />
        </div>
      )}

      {preview &&
        createPortal(
          <div className={'absolute flex justify-center items-center aspect-square'}>
            <Component className={mx('w-full h-full')} />
          </div>,
          preview,
        )}
    </>
  );
};
