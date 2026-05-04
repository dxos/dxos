//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const Settings = Capability.lazy('Settings', () => import('./settings'));
