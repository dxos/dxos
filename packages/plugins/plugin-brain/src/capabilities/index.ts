//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type OperationHandlerSet } from '@dxos/compute';

export * from './fact-store';

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const SkillDefinition = Capability.lazy('SkillDefinition', () => import('./skill-definition'));
export const FactStore = Capability.lazy('FactStore', () => import('./fact-store'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const Settings = Capability.lazy('Settings', () => import('./settings'));
