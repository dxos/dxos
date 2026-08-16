//
// Copyright 2020 DXOS.org
//

import { type DataService } from '@dxos/protocols/rpc';

export type SpaceSyncState = DataService.SpaceSyncState;
export namespace SpaceSyncState {
  export type PeerState = DataService.SpaceSyncState.PeerState;
}

export * from './automerge';
export * from './client';
export {
  type AddCoreOptions,
  type AtomicReplaceObjectProps,
  type BindOptions,
  type BranchStore,
  type DecodedAutomergePrimaryValue,
  type GetObjectCoreByIdOptions,
  type InitRootProxyFn,
  type ItemsUpdatedEvent,
  type LoadObjectOptions,
  META_NAMESPACE,
  type ObjectCoreOptions,
  type SpaceDocumentHeads,
  objectIsUpdated,
} from './core-db';
export {
  type CloneOptions,
  EchoReactiveHandler,
  MutationOutsideChangeContextError,
  ObjectVersion,
  type ProxyTarget,
  type Selection,
  type SubscriptionHandle,
  type UpdateInfo,
  type VersionDiff,
  checkoutVersion,
  clone,
  createArrayMethodError,
  createBranch,
  createObject,
  createPropertyDeleteError,
  createPropertySetError,
  createSubscription,
  deleteBranch,
  findObjectWithForeignKey,
  getBranches,
  getCurrentBranch,
  getDXNWithSpaceKey,
  getEditHistory,
  getEditHistoryWithDiffs,
  getObjectCore,
  getObjectOnBranch,
  getVersion,
  initEchoReactiveObjectRootProxy,
  isEchoObject,
  matchKeys,
  mergeBranch,
  switchBranch,
  syncBranch,
} from './echo-handler';
export * from './hypergraph';
export * from './proxy-db';
export * from './query';
export * from './registry';
export * from './serialized-space';
export * from './serializer';
export * from './text';
export * from './util';
