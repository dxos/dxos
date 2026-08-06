//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as PresenterOperation from '../types/PresenterOperation';

export const PresenterOperationHandlerSet = OperationHandlerSet.lazy([
  PresenterOperation.TogglePresentation.pipe(Operation.lazyHandler(() => import('./toggle-presentation'))),
]);
