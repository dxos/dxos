//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { FeatureOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  FeatureOperation.Create.pipe(Operation.lazyHandler(() => import('./operations/feature/create.ts'))),
  FeatureOperation.Update.pipe(Operation.lazyHandler(() => import('./operations/feature/update.ts'))),
  FeatureOperation.Delete.pipe(Operation.lazyHandler(() => import('./operations/feature/delete.ts'))),
  FeatureOperation.CreateSpec.pipe(Operation.lazyHandler(() => import('./operations/feature/create-spec.ts'))),
  FeatureOperation.UpdateSpec.pipe(Operation.lazyHandler(() => import('./operations/feature/update-spec.ts'))),
  FeatureOperation.AddDependency.pipe(Operation.lazyHandler(() => import('./operations/feature/add-dependency.ts'))),
  FeatureOperation.RemoveDependency.pipe(
    Operation.lazyHandler(() => import('./operations/feature/remove-dependency.ts')),
  ),
  FeatureOperation.LinkTask.pipe(Operation.lazyHandler(() => import('./operations/feature/link-task.ts'))),
  FeatureOperation.GetFeatures.pipe(Operation.lazyHandler(() => import('./operations/feature/get-features.ts'))),
  FeatureOperation.ImportLinks.pipe(Operation.lazyHandler(() => import('./operations/feature/import-links.ts'))),
  FeatureOperation.ImportSpec.pipe(Operation.lazyHandler(() => import('./operations/feature/import-spec.ts'))),
  FeatureOperation.ExportSpec.pipe(Operation.lazyHandler(() => import('./operations/feature/export-spec.ts'))),
]);
