//
// Copyright 2025 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useRef, useState, useEffect, memo } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useBoardContext } from './context';
import { isPiece, type Location } from './types';
import { type DOMRectBounds } from './util';

type HoveredState = 'idle' | 'validMove' | 'invalidMove';

export type SquareProps = ThemedClassName<{
  location: Location;
  bounds: DOMRectBounds;
  label?: string;
}>;

export const Square = memo(({ location, bounds, label, classNames }: SquareProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<HoveredState>('idle');
  const { model } = useBoardContext();

  useEffect(() => {
    const el = ref.current;
    invariant(el);

    return dropTargetForElements({
      element: el,
      getData: () => ({ location }),
      canDrop: ({ source }) => {
        log('canDrop', { source: source.data });
        return true;
      },
      onDragEnter: ({ source }) => {
        log('onDragEnter', { source: source.data });
        const piece = source.data.piece;
        if (!isPiece(piece)) {
          return;
        }

        if (model?.isValidMove({ from: piece.location, to: location, piece: piece.type })) {
          setState('validMove');
        } else {
          setState('invalidMove');
        }
      },
      onDragLeave: () => setState('idle'),
      onDrop: () => setState('idle'),
    });
  }, [model, location]);

  return (
    <div
      ref={ref}
      style={bounds}
      className={mx(
        'absolute flex justify-center items-center border-2 box-border select-none',
        classNames,
        state === 'validMove' ? 'border-neutral-800' : 'border-transparent',
      )}
    >
      {label && <div className={mx('absolute bottom-1 left-1 text-xs text-neutral-500')}>{label}</div>}
    </div>
  );
});

Square.displayName = 'Square';
