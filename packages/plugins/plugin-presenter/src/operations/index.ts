//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { PresenterOperation } from '#types';

export const PresenterOperationHandlerSet = OperationHandlerSet.lazy([
  PresenterOperation.TogglePresentation.pipe(Operation.lazyHandler(() => import('./toggle-presentation'))),
]);
