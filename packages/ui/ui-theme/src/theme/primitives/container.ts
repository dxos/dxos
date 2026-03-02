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

const containerColumn: ComponentFunction<Record<string, any>> = (_, ...etc) => mx('dx-column w-full grid', ...etc);

const containerSegment: ComponentFunction<Record<string, any>> = (_, ...etc) => mx('col-start-2', ...etc);

export const containerTheme = {
  main: containerMain,
  column: containerColumn,
  segment: containerSegment,
};
