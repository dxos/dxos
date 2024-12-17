//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type Point } from '../../layout';
import { eventsNone } from '../styles';
import { GridPattern } from '../svg';
import { testId } from '../util';

const gridRations = [1 / 2, 1, 2, 8];

export type GridProps = ThemedClassName<{ id: string; size: number; offset?: Point; scale?: number }>;

export const Grid = forwardRef<SVGSVGElement, GridProps>(
  ({ id: parentId, size, offset = { x: 0, y: 0 }, scale = 1, classNames }, forwardedRef) => {
    const grids = useMemo(
      () =>
        gridRations
          .map((ratio) => ({ id: ratio, size: ratio * size * scale }))
          .filter(({ size }) => size >= 16 && size <= 128),
      [size, scale],
    );

    return (
      <svg
        {...testId('dx-canvas-grid')}
        ref={forwardedRef}
        className={mx('absolute inset-0 w-full h-full', eventsNone, classNames)}
      >
        {/* NOTE: The pattern needs to be offset so that the middle of the pattern aligns with the grid. */}
        <defs>
          {grids.map(({ id, size }) => (
            <GridPattern key={id} id={createId(parentId, id)} offset={offset} size={size} />
          ))}
        </defs>
        {grids.map(({ id, size }, i) => (
          <rect key={id} fill={`url(#${createId(parentId, id)})`} width='100%' height='100%' />
        ))}
      </svg>
    );
  },
);

const createId = (parent: string, grid: number) => `plugin-canvas-grid-${parent}-${grid}`;
