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
 * Three-column icon-slot row: spans all 3 columns of the parent Container.Column grid.
 * Uses CSS subgrid to inherit column sizing from the parent Column.
 * Children map to: [col-1: icon/slot] [col-2: content] [col-3: icon/action].
 */
const containerRow: ComponentFunction<Record<string, any>> = (_, ...etc) =>
  mx('col-span-3 grid grid-cols-subgrid', ...etc);

/**
 * NOTE: Must not use overflow-hidden here since it will clip input focus rings.
 * Occupies only the center column (col-2) of the parent Container.Column grid.
 */
const containerSegment: ComponentFunction<Record<string, any>> = (_, ...etc) =>
  mx('col-start-2 col-span-1 min-w-0', ...etc);

export const containerTheme = {
  main: containerMain,
  column: containerColumn,
  row: containerRow,
  segment: containerSegment,
};
