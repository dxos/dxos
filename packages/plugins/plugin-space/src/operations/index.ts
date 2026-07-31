// Copyright 2025 DXOS.org

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SpaceOperation } from './definitions';

export { SpaceOperation } from './definitions';

export const SpaceOperationHandlerSet = OperationHandlerSet.keyed([
  [SpaceOperation.AddObject, () => import('./add-object')],
  [SpaceOperation.AddRelation, () => import('./add-relation')],
  [SpaceOperation.AddType, () => import('./add-type')],
  [SpaceOperation.Close, () => import('./close')],
  [SpaceOperation.Create, () => import('./create')],
  [SpaceOperation.Delete, () => import('./delete')],
  [SpaceOperation.DeleteField, () => import('./delete-field')],
  [SpaceOperation.DuplicateObject, () => import('./duplicate-object')],
  [SpaceOperation.ExportSpace, () => import('./export-space')],
  [SpaceOperation.GetShareLink, () => import('./get-share-link')],
  [SpaceOperation.ImportSpace, () => import('./import-space')],
  [SpaceOperation.Join, () => import('./join')],
  [SpaceOperation.Migrate, () => import('./migrate')],
  [SpaceOperation.Open, () => import('./open')],
  [SpaceOperation.OpenCreateObject, () => import('./open-create-object')],
  [SpaceOperation.OpenCreateSpace, () => import('./open-create-space')],
  [SpaceOperation.OpenImportSpace, () => import('./open-import-space')],
  [SpaceOperation.OpenMembers, () => import('./open-members')],
  [SpaceOperation.OpenSettings, () => import('./open-settings')],
  [SpaceOperation.RemoveObjects, () => import('./remove-objects')],
  [SpaceOperation.Rename, () => import('./rename')],
  [SpaceOperation.RenameObject, () => import('./rename-object')],
  [SpaceOperation.RestoreField, () => import('./restore-field')],
  [SpaceOperation.RestoreObjects, () => import('./restore-objects')],
  [SpaceOperation.Share, () => import('./share')],
  [SpaceOperation.Snapshot, () => import('./snapshot')],
  [SpaceOperation.WaitForObject, () => import('./wait-for-object')],
]);
