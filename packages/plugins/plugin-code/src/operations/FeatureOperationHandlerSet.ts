//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { FeatureOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  FeatureOperation.Create.pipe(Operation.lazyHandler(() => import('./feature/create.ts'))),
  FeatureOperation.Update.pipe(Operation.lazyHandler(() => import('./feature/update.ts'))),
  FeatureOperation.Delete.pipe(Operation.lazyHandler(() => import('./feature/delete.ts'))),
  FeatureOperation.CreateSpec.pipe(Operation.lazyHandler(() => import('./feature/create-spec.ts'))),
  FeatureOperation.UpdateSpec.pipe(Operation.lazyHandler(() => import('./feature/update-spec.ts'))),
  FeatureOperation.AddDependency.pipe(Operation.lazyHandler(() => import('./feature/add-dependency.ts'))),
  FeatureOperation.RemoveDependency.pipe(Operation.lazyHandler(() => import('./feature/remove-dependency.ts'))),
  FeatureOperation.LinkTask.pipe(Operation.lazyHandler(() => import('./feature/link-task.ts'))),
  FeatureOperation.GetFeatures.pipe(Operation.lazyHandler(() => import('./feature/get-features.ts'))),
  FeatureOperation.ImportLinks.pipe(Operation.lazyHandler(() => import('./feature/import-links.ts'))),
  FeatureOperation.ImportSpec.pipe(Operation.lazyHandler(() => import('./feature/import-spec.ts'))),
  FeatureOperation.ExportSpec.pipe(Operation.lazyHandler(() => import('./feature/export-spec.ts'))),
]);
