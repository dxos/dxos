//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { StudioOperation } from '#types';

export const StudioOperationHandlerSet = OperationHandlerSet.lazy([
  StudioOperation.Generate.pipe(Operation.lazyHandler(() => import('./generate.ts'))),
  StudioOperation.CreateStoryboard.pipe(Operation.lazyHandler(() => import('./create-storyboard.ts'))),
  StudioOperation.AppendFrame.pipe(Operation.lazyHandler(() => import('./append-frame.ts'))),
  StudioOperation.ListProviders.pipe(Operation.lazyHandler(() => import('./list-providers.ts'))),
]);
