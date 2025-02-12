//
// Copyright 2025 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useRef, useState, useEffect } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { isLocation, isPiece, type Move, type Location } from './types';
import { type DOMRectBounds } from './util';

type HoveredState = 'idle' | 'validMove' | 'invalidMove';

export type SquareProps = ThemedClassName<{
  location: Location;
  bounds: DOMRectBounds;
  label?: string;
  isValidMove?: (move: Move) => boolean;
}>;

export const Square = ({ location, bounds, label, classNames, isValidMove }: SquareProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<HoveredState>('idle');

  useEffect(() => {
    const el = ref.current;
    invariant(el);

    return dropTargetForElements({
      element: el,
      getData: () => ({ location }),
      canDrop: ({ source }) => {
        log('canDrop', { date: Date.now(), source: source.data });
        return true;
      },
      onDragEnter: ({ source }) => {
        log('onDragEnter', { date: Date.now(), source: source.data });
        if (!isLocation(source.data.location) || !isPiece(source.data.pieceType)) {
          return;
        }

        const sourceLocation = source.data.location;
        const pieceType = source.data.pieceType;
        if (isValidMove?.({ source: sourceLocation, target: location, piece: pieceType })) {
          setState('validMove');
        } else {
          setState('invalidMove');
        }
      },
      onDragLeave: () => setState('idle'),
      onDrop: () => setState('idle'),
    });
  }, [location]);

  return (
    <div
      ref={ref}
      style={bounds}
      className={mx(
        'absolute flex justify-center items-center border-2 box-border select-none',
        classNames,
        state === 'validMove' ? 'border-primary-500' : 'border-transparent',
      )}
    >
      {label && <div className={mx('absolute bottom-1 left-1 text-xs text-neutral-500')}>{label}</div>}
    </div>
  );
};
