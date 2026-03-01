//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction } from '@dxos/ui-types';

import { mx } from '../../util';

const containerColumn: ComponentFunction<void> = (_, ...etc) => mx('w-full grid', ...etc);

const containerSegment: ComponentFunction<void> = (_, ...etc) =>
  mx('col-span-full grid grid-cols-subgrid col-start-2', ...etc);

export const containerTheme = {
  column: containerColumn,
  segment: containerSegment,
};
