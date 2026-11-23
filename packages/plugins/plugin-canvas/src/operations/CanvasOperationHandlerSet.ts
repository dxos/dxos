//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { CanvasOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  CanvasOperation.CreateGenerator.pipe(Operation.lazyHandler(() => import('./create-generator.ts'))),
  CanvasOperation.UpdateGenerator.pipe(Operation.lazyHandler(() => import('./update-generator.ts'))),
  CanvasOperation.InspectGenerator.pipe(Operation.lazyHandler(() => import('./inspect-generator.ts'))),
  CanvasOperation.AddGenerator.pipe(Operation.lazyHandler(() => import('./add-generator.ts'))),
  CanvasOperation.Apply.pipe(Operation.lazyHandler(() => import('./apply.ts'))),
  CanvasOperation.Patch.pipe(Operation.lazyHandler(() => import('./patch.ts'))),
]);
