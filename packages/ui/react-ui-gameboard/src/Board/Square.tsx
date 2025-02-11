//
// Copyright 2025 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useRef, useState, useEffect } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { isValidMove, isEqualLocation, isLocation, isPiece, type Location } from './types';
import { type DOMRectBounds } from './util';

type HoveredState = 'idle' | 'validMove' | 'invalidMove';

export type SquareProps = ThemedClassName<{
  location: Location;
  bounds: DOMRectBounds;
  label?: string;
}>;

export const Square = ({ location, bounds, label, classNames }: SquareProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<HoveredState>('idle');

  useEffect(() => {
    const el = ref.current;
    invariant(el);

    return dropTargetForElements({
      element: el,
      getData: () => ({ location }),
      canDrop: ({ source }) => {
        if (!isLocation(source.data.location)) {
          return false;
        }

        return !isEqualLocation(source.data.location, location);
      },
      onDragEnter: ({ source }) => {
        log.info('onDragEnter', { source: source.data });
        if (!isLocation(source.data.location) || !isPiece(source.data.pieceType)) {
          return;
        }

        if (isValidMove(source.data.location, location, source.data.pieceType)) {
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
        'absolute flex justify-center items-center select-none',
        classNames,
        state === 'validMove' && 'border border-primary-500',
      )}
    >
      {label && <div className={mx('absolute top-1 left-1 text-xs text-neutral-500')}>{label}</div>}
    </div>
  );
};

export const getSquareLocation = (container: HTMLElement, location: Location): HTMLElement | null => {
  return container.querySelector(`[data-location="${location.join(',')}"]`);
};
