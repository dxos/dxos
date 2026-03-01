//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction } from '@dxos/ui-types';

import { mx } from '../../util';

// TODO(burdon): Define types.

const containerMain: ComponentFunction<{ toolbar?: boolean }> = ({ toolbar }, ...etc) =>
  mx(
    'h-full w-full grid grid-cols-[100%] overflow-hidden',
    toolbar && [
      '[.dx-main-mobile-layout_&>.dx-toolbar]:px-3 [&>.dx-toolbar]:relative',
      '[&>.dx-toolbar]:border-b [&>.dx-toolbar]:border-subdued-separator',
    ],
    ...etc,
  );

const containerColumn: ComponentFunction<void> = (_, ...etc) => mx('w-full grid', ...etc);

const containerSegment: ComponentFunction<void> = (_, ...etc) =>
  mx('col-span-full grid grid-cols-subgrid col-start-2', ...etc);

export const containerTheme = {
  main: containerMain,
  column: containerColumn,
  segment: containerSegment,
};
