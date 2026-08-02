//
// Copyright 2025 DXOS.org
//

// NOTE: This leaf module is re-exported by the `/plugin` stub, so it must not import the
// operation definitions (or anything else heavy) — that would drag the plugin implementation
// into every host's eager module graph.

import { OperationHandlerSet } from '@dxos/compute';

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
  () => import('./find-duplicates'),
  () => import('./get-share-link'),
  () => import('./import-space'),
  () => import('./join'),
  () => import('./merge-duplicates'),
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
