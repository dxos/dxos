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

export const containerTheme = {
  main: containerMain,
};
