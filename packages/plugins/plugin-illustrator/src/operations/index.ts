//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DrawingOperation } from '#types';

export const IllustratorOperationHandlerSet = OperationHandlerSet.lazy([
  DrawingOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),
  DrawingOperation.Edit.pipe(Operation.lazyHandler(() => import('./edit'))),
  DrawingOperation.Generate.pipe(Operation.lazyHandler(() => import('./generate'))),
  DrawingOperation.Read.pipe(Operation.lazyHandler(() => import('./read'))),
]);
