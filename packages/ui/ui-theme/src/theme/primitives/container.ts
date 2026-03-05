//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction } from '@dxos/ui-types';

import { mx } from '../../util';

const containerMain: ComponentFunction<{ toolbar?: boolean }> = ({ toolbar }, ...etc) =>
  mx(
    'h-full w-full grid grid-cols-[100%] overflow-hidden',
    toolbar && [
      '[.dx-main-mobile-layout_&>.dx-toolbar]:px-3 [&>.dx-toolbar]:relative',
      '[&>.dx-toolbar]:border-b [&>.dx-toolbar]:border-subdued-separator',
    ],
    ...etc,
  );

const containerColumn: ComponentFunction<Record<string, any>> = (_, ...etc) =>
  mx('dx-column w-full min-w-0 grid grid-cols-[minmax(0,1fr)]', ...etc);

/**
 * Three-column icon-slot row: [rail-item | 1fr | rail-item].
 * Left and right columns are sized to match the rail icon slot width.
 */
const containerRow: ComponentFunction<Record<string, any>> = (_, ...etc) =>
  mx('grid grid-cols-[var(--dx-rail-item)_minmax(0,1fr)_var(--dx-rail-item)] gap-x-1', ...etc);

/**
 * NOTE: Must not use overflow-hidden here since it will clip input focus rings.
 */
const containerSegment: ComponentFunction<Record<string, any>> = (_, ...etc) => mx('col-start-2 min-w-0', ...etc);

export const containerTheme = {
  main: containerMain,
  column: containerColumn,
  segment: containerSegment,
  row: containerRow,
};
