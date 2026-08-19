//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SpaceObjectOperation, SpaceOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  SpaceObjectOperation.AddTag.pipe(Operation.lazyHandler(() => import('./add-tag'))),
  SpaceObjectOperation.GetObjects.pipe(Operation.lazyHandler(() => import('./get-objects'))),
  SpaceObjectOperation.QueryObjects.pipe(Operation.lazyHandler(() => import('./query-objects'))),
  SpaceObjectOperation.QueryTypes.pipe(Operation.lazyHandler(() => import('./query-types'))),
  SpaceObjectOperation.RemoveTag.pipe(Operation.lazyHandler(() => import('./remove-tag'))),
  SpaceObjectOperation.UpdateObject.pipe(Operation.lazyHandler(() => import('./update-object'))),
  SpaceOperation.AddObject.pipe(Operation.lazyHandler(() => import('./add-object'))),
  SpaceOperation.AddRelation.pipe(Operation.lazyHandler(() => import('./add-relation'))),
  SpaceOperation.AddType.pipe(Operation.lazyHandler(() => import('./add-type'))),
  SpaceOperation.Close.pipe(Operation.lazyHandler(() => import('./close'))),
  SpaceOperation.CollectGarbage.pipe(Operation.lazyHandler(() => import('./collect-garbage'))),
  SpaceOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),
  SpaceOperation.Delete.pipe(Operation.lazyHandler(() => import('./delete'))),
  SpaceOperation.DeleteField.pipe(Operation.lazyHandler(() => import('./delete-field'))),
  SpaceOperation.DuplicateObject.pipe(Operation.lazyHandler(() => import('./duplicate-object'))),
  SpaceOperation.ExportSpace.pipe(Operation.lazyHandler(() => import('./export-space'))),
  SpaceOperation.FindDuplicates.pipe(Operation.lazyHandler(() => import('./find-duplicates'))),
  SpaceOperation.GetShareLink.pipe(Operation.lazyHandler(() => import('./get-share-link'))),
  SpaceOperation.ImportSpace.pipe(Operation.lazyHandler(() => import('./import-space'))),
  SpaceOperation.Join.pipe(Operation.lazyHandler(() => import('./join'))),
  SpaceOperation.MergeDuplicates.pipe(Operation.lazyHandler(() => import('./merge-duplicates'))),
  SpaceOperation.Migrate.pipe(Operation.lazyHandler(() => import('./migrate'))),
  SpaceOperation.Open.pipe(Operation.lazyHandler(() => import('./open'))),
  SpaceOperation.OpenCreateObject.pipe(Operation.lazyHandler(() => import('./open-create-object'))),
  SpaceOperation.OpenCreateSpace.pipe(Operation.lazyHandler(() => import('./open-create-space'))),
  SpaceOperation.OpenImportSpace.pipe(Operation.lazyHandler(() => import('./open-import-space'))),
  SpaceOperation.OpenMembers.pipe(Operation.lazyHandler(() => import('./open-members'))),
  SpaceOperation.OpenSettings.pipe(Operation.lazyHandler(() => import('./open-settings'))),
  SpaceOperation.RemoveAllObjects.pipe(Operation.lazyHandler(() => import('./remove-all-objects'))),
  SpaceOperation.RemoveObjects.pipe(Operation.lazyHandler(() => import('./remove-objects'))),
  SpaceOperation.Rename.pipe(Operation.lazyHandler(() => import('./rename'))),
  SpaceOperation.RenameObject.pipe(Operation.lazyHandler(() => import('./rename-object'))),
  SpaceOperation.RestoreField.pipe(Operation.lazyHandler(() => import('./restore-field'))),
  SpaceOperation.RestoreObjects.pipe(Operation.lazyHandler(() => import('./restore-objects'))),
  SpaceOperation.Share.pipe(Operation.lazyHandler(() => import('./share'))),
  SpaceOperation.Snapshot.pipe(Operation.lazyHandler(() => import('./snapshot'))),
  SpaceOperation.WaitForObject.pipe(Operation.lazyHandler(() => import('./wait-for-object'))),
]);
