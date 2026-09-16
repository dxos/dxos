//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SpaceOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  SpaceOperation.AddTag.pipe(Operation.lazyHandler(() => import('./add-tag.ts'))),
  SpaceOperation.GetObjects.pipe(Operation.lazyHandler(() => import('./get-objects.ts'))),
  SpaceOperation.QueryObjects.pipe(Operation.lazyHandler(() => import('./query-objects.ts'))),
  SpaceOperation.QueryTypes.pipe(Operation.lazyHandler(() => import('./query-types.ts'))),
  SpaceOperation.RemoveTag.pipe(Operation.lazyHandler(() => import('./remove-tag.ts'))),
  SpaceOperation.UpdateObject.pipe(Operation.lazyHandler(() => import('./update-object.ts'))),
  SpaceOperation.AddObject.pipe(Operation.lazyHandler(() => import('./add-object.ts'))),
  SpaceOperation.AddRelation.pipe(Operation.lazyHandler(() => import('./add-relation.ts'))),
  SpaceOperation.AddType.pipe(Operation.lazyHandler(() => import('./add-type.ts'))),
  SpaceOperation.Close.pipe(Operation.lazyHandler(() => import('./close.ts'))),
  SpaceOperation.CollectGarbage.pipe(Operation.lazyHandler(() => import('./collect-garbage.ts'))),
  SpaceOperation.Create.pipe(Operation.lazyHandler(() => import('./create.ts'))),
  SpaceOperation.Delete.pipe(Operation.lazyHandler(() => import('./delete.ts'))),
  SpaceOperation.DeleteField.pipe(Operation.lazyHandler(() => import('./delete-field.ts'))),
  SpaceOperation.DuplicateObject.pipe(Operation.lazyHandler(() => import('./duplicate-object.ts'))),
  SpaceOperation.ExportSpace.pipe(Operation.lazyHandler(() => import('./export-space.ts'))),
  SpaceOperation.FindDuplicates.pipe(Operation.lazyHandler(() => import('./find-duplicates.ts'))),
  SpaceOperation.GetShareLink.pipe(Operation.lazyHandler(() => import('./get-share-link.ts'))),
  SpaceOperation.ImportSpace.pipe(Operation.lazyHandler(() => import('./import-space.ts'))),
  SpaceOperation.Join.pipe(Operation.lazyHandler(() => import('./join.ts'))),
  SpaceOperation.MergeDuplicates.pipe(Operation.lazyHandler(() => import('./merge-duplicates.ts'))),
  SpaceOperation.Migrate.pipe(Operation.lazyHandler(() => import('./migrate.ts'))),
  SpaceOperation.Open.pipe(Operation.lazyHandler(() => import('./open.ts'))),
  SpaceOperation.OpenObjectForm.pipe(Operation.lazyHandler(() => import('./open-object-form.ts'))),
  SpaceOperation.OpenCreateSpace.pipe(Operation.lazyHandler(() => import('./open-create-space.ts'))),
  SpaceOperation.OpenImportSpace.pipe(Operation.lazyHandler(() => import('./open-import-space.ts'))),
  SpaceOperation.OpenMembers.pipe(Operation.lazyHandler(() => import('./open-members.ts'))),
  SpaceOperation.OpenSettings.pipe(Operation.lazyHandler(() => import('./open-settings.ts'))),
  SpaceOperation.RemoveAllObjects.pipe(Operation.lazyHandler(() => import('./remove-all-objects.ts'))),
  SpaceOperation.RemoveObjects.pipe(Operation.lazyHandler(() => import('./remove-objects.ts'))),
  SpaceOperation.Rename.pipe(Operation.lazyHandler(() => import('./rename.ts'))),
  SpaceOperation.RenameObject.pipe(Operation.lazyHandler(() => import('./rename-object.ts'))),
  SpaceOperation.RestoreField.pipe(Operation.lazyHandler(() => import('./restore-field.ts'))),
  SpaceOperation.RestoreObjects.pipe(Operation.lazyHandler(() => import('./restore-objects.ts'))),
  SpaceOperation.Share.pipe(Operation.lazyHandler(() => import('./share.ts'))),
  SpaceOperation.Snapshot.pipe(Operation.lazyHandler(() => import('./snapshot.ts'))),
  SpaceOperation.WaitForObject.pipe(Operation.lazyHandler(() => import('./wait-for-object.ts'))),
]);
