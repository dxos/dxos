//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { PresenterOperation } from '#types';

export const PresenterOperationHandlerSet = OperationHandlerSet.keyed([
  [PresenterOperation.TogglePresentation, () => import('./toggle-presentation')],
]);
