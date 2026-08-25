//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { PresenterOperation } from '#types';

export const PresenterOperationHandlerSet = OperationHandlerSet.lazy([
  PresenterOperation.SetPresenting.pipe(Operation.lazyHandler(() => import('./set-presenting'))),
]);
