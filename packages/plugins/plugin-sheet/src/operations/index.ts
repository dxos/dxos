//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SheetOperation } from '#types';

export const SheetOperationHandlerSet = OperationHandlerSet.lazy([
  SheetOperation.Create.pipe(Operation.lazyHandler(() => import('./create.ts'))),
  SheetOperation.DropAxis.pipe(Operation.lazyHandler(() => import('./drop-axis.ts'))),
  SheetOperation.GetValues.pipe(Operation.lazyHandler(() => import('./get-values.ts'))),
  SheetOperation.InsertAxis.pipe(Operation.lazyHandler(() => import('./insert-axis.ts'))),
  SheetOperation.RestoreAxis.pipe(Operation.lazyHandler(() => import('./restore-axis.ts'))),
  SheetOperation.ScrollToAnchor.pipe(Operation.lazyHandler(() => import('./scroll-to-anchor.ts'))),
  SheetOperation.SetValues.pipe(Operation.lazyHandler(() => import('./set-values.ts'))),
]);
