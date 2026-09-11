//
// Copyright 2020 DXOS.org
//

import { type DataService } from '@dxos/protocols/rpc';

export type SpaceSyncState = DataService.SpaceSyncState;
export namespace SpaceSyncState {
  export type PeerState = DataService.SpaceSyncState.PeerState;
}

export * from './automerge/index.ts';
export * from './client/index.ts';
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
} from './core-db/index.ts';
// One definition, in `echo`, now that the write gate is shared; re-exported so the public name is
// unchanged for consumers.
export {
  MutationOutsideChangeContextError,
  createArrayMethodError,
  createPropertyDeleteError,
  createPropertySetError,
} from '@dxos/echo/internal';
export {
  EchoReactiveHandler,
  type ProxyTarget,
  type Selection,
  type SubscriptionHandle,
  type UpdateInfo,
  type VersionDiff,
  checkoutVersion,
  createBranch,
  createObject,
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
  initEchoReactiveObjectRootProxy,
  isEchoObject,
  matchKeys,
  mergeBranch,
  switchBranch,
  syncBranch,
} from './echo-handler/index.ts';
export * from './hypergraph.ts';
export * from './proxy-db/index.ts';
export * from './query/index.ts';
export * from './registry/index.ts';
export * from './serialized-space.ts';
export * from './serializer.ts';
export * from './text.ts';
export * from './util/index.ts';
