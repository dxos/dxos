//
// Copyright 2025 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { memo, useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useGameboardContext } from './GameboardContext.ts';
import { type Location, isPiece, locationToString } from './types.ts';

type HoveredState = 'idle' | 'validMove' | 'invalidMove';

const SQUARE_NAME = 'Square';

/**
 * A square is a cell of its board's grid, not an absolutely positioned box: absolute bounds come from
 * `offsetLeft`/`offsetWidth`, which are integers, so squares laid over fractional grid tracks leave
 * hairline gaps where the rounding steps. Pieces are positioned from measurements; squares are the
 * measurement.
 */
export type SquareProps = ThemedClassName<{
  location: Location;
  label?: string;
}>;

export const Square = memo(({ location, label, classNames }: SquareProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<HoveredState>('idle');
  const { model } = useGameboardContext(SQUARE_NAME);

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
      data-location={locationToString(location)}
      className={mx(
        'relative flex justify-center items-center border-2 box-border select-none',
        state === 'validMove' ? 'border-neutral-800' : 'border-transparent',
        classNames,
      )}
    >
      {label && <div className={mx('absolute bottom-1 left-1 text-xs text-neutral-500')}>{label}</div>}
    </div>
  );
});

Square.displayName = SQUARE_NAME;
