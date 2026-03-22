// Copyright 2025 DXOS.org

import { OperationHandlerSet } from '@dxos/operation';

export { SpaceOperation } from './definitions';

export const SpaceOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-object'),
  () => import('./add-relation'),
  () => import('./add-schema'),
  () => import('./close'),
  () => import('./create'),
  () => import('./delete-field'),
  () => import('./duplicate-object'),
  () => import('./get-share-link'),
  () => import('./join'),
  () => import('./lock'),
  () => import('./migrate'),
  () => import('./open'),
  () => import('./open-create-object'),
  () => import('./open-create-space'),
  () => import('./open-members'),
  () => import('./open-settings'),
  () => import('./remove-objects'),
  () => import('./rename'),
  () => import('./rename-object'),
  () => import('./restore-field'),
  () => import('./restore-objects'),
  () => import('./share'),
  () => import('./snapshot'),
  () => import('./unlock'),
  () => import('./wait-for-object'),
);
