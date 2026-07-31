//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { PresenterOperation } from '#types';

export const PresenterOperationHandlerSet = OperationHandlerSet.keyed([
  [PresenterOperation.TogglePresentation, () => import('./toggle-presentation')],
]);
