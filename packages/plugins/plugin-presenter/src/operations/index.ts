//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as PresenterOperation from '../types/PresenterOperation';

export const PresenterOperationHandlerSet = OperationHandlerSet.keyed([
  [PresenterOperation.TogglePresentation, () => import('./toggle-presentation')],
]);
