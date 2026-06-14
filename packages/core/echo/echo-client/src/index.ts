//
// Copyright 2020 DXOS.org
//

export { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';

export * from './automerge';
export * from './client';
export {
  CoreDatabase,
  type AddCoreOptions,
  type AtomicReplaceObjectProps,
  type CoreDatabaseProps,
  type GetObjectCoreByIdOptions,
  type InitRootProxyFn,
  type ItemsUpdatedEvent,
  type LoadObjectOptions,
  type SpaceDocumentHeads,
  META_NAMESPACE,
  type BindOptions,
  type ObjectCoreOptions,
  objectIsUpdated,
  DocAccessor,
  type DecodedAutomergePrimaryValue,
  type IDocHandle,
  type KeyPath,
  isValidKeyPath,
} from './core-db';
export { type CloneOptions, clone } from './echo-handler';
export { createDocAccessor } from './echo-handler';
export { createObject, EchoReactiveHandler, initEchoReactiveObjectRootProxy } from './echo-handler';
export { isEchoObject } from './echo-handler';
export { getEditHistory, getEditHistoryWithDiffs, type VersionDiff, checkoutVersion } from './echo-handler';
export { setTimeTravel, clearTimeTravel } from './echo-handler';
export {
  getBranches,
  getCurrentBranch,
  createBranch,
  switchBranch,
  mergeBranch,
  deleteBranch,
} from './echo-handler';
export { type ProxyTarget } from './echo-handler';
export {
  MutationOutsideChangeContextError,
  createPropertySetError,
  createPropertyDeleteError,
  createArrayMethodError,
} from './echo-handler';
export { type Selection, type SubscriptionHandle, type UpdateInfo, createSubscription } from './echo-handler';
export { getDXNWithSpaceKey, findObjectWithForeignKey, matchKeys } from './echo-handler';
export { ObjectVersion, getVersion } from './echo-handler';
export * from './guarded-scope';
export * from './hypergraph';
export * from './proxy-db';
export * from './query';
export * from './queue';
export * from './registry';
export * from './serialized-space';
export * from './serializer';
export * from './text';
export * from './util';
