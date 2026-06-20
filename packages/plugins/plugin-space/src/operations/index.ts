// Copyright 2025 DXOS.org

import { OperationHandlerSet } from '@dxos/compute';

export { SpaceOperation } from './definitions';

export const SpaceOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./add-object'),
  () => import('./add-relation'),
  () => import('./add-type'),
  () => import('./close'),
  () => import('./create'),
  () => import('./delete'),
  () => import('./delete-field'),
  () => import('./duplicate-object'),
  () => import('./export-space'),
  () => import('./get-share-link'),
  () => import('./import-space'),
  () => import('./join'),
  () => import('./migrate'),
  () => import('./open'),
  () => import('./open-create-object'),
  () => import('./open-create-space'),
  () => import('./open-import-space'),
  () => import('./open-members'),
  () => import('./open-settings'),
  () => import('./remove-objects'),
  () => import('./rename'),
  () => import('./rename-object'),
  () => import('./restore-field'),
  () => import('./restore-objects'),
  () => import('./share'),
  () => import('./snapshot'),
  () => import('./wait-for-object'),
);
