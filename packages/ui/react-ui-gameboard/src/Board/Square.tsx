//
// Copyright 2025 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useRef, useState, useEffect, type PropsWithChildren } from 'react';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { canMove, isCoord, isPiece, type Coord } from './types';

type HoveredState = 'idle' | 'validMove' | 'invalidMove';

export type SquareProps = ThemedClassName<
  PropsWithChildren<{
    location: Coord;
    label?: string;
  }>
>;

export const Square = ({ location, label, children, classNames }: SquareProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<HoveredState>('idle');

  useEffect(() => {
    const el = ref.current;
    invariant(el);

    return dropTargetForElements({
      element: el,
      onDragEnter: ({ source }) => {
        // Source is the piece being dragged over the drop target.
        if (!isCoord(source.data.location) || !isPiece(source.data.pieceType)) {
          return;
        }

        if (canMove(source.data.location, location, source.data.pieceType, [])) {
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
      {...{ ['data-location' as const]: location.join(',') }}
      className={mx('relative flex justify-center items-center aspect-square bg-transparent', classNames)}
    >
      {label && <div className={mx('absolute top-1 left-1 text-xs text-neutral-500')}>{label}</div>}
      {children}
    </div>
  );
};

export const getSquareLocation = (container: HTMLElement, location: Coord): HTMLElement | null => {
  return container.querySelector(`[data-location="${location.join(',')}"]`);
};
