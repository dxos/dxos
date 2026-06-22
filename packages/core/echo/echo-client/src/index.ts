//
// Copyright 2020 DXOS.org
//

export { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';

export * from './automerge';
export * from './client';
export {
  type AddCoreOptions,
  type AtomicReplaceObjectProps,
  type GetObjectCoreByIdOptions,
  type InitRootProxyFn,
  type ItemsUpdatedEvent,
  type LoadObjectOptions,
  type SpaceDocumentHeads,
  META_NAMESPACE,
  type BindOptions,
  type ObjectCoreOptions,
  objectIsUpdated,
  type DecodedAutomergePrimaryValue,
} from './core-db';
export {
  type CloneOptions,
  clone,
  type ProxyTarget,
  getEditHistory,
  checkoutVersion,
  getObjectCore,
  isEchoObject,
  createObject,
  EchoReactiveHandler,
  initEchoReactiveObjectRootProxy,
  MutationOutsideChangeContextError,
  createPropertySetError,
  createPropertyDeleteError,
  createArrayMethodError,
  getDXNWithSpaceKey,
  findObjectWithForeignKey,
  matchKeys,
  ObjectVersion,
  getVersion,
  type Selection,
  type SubscriptionHandle,
  type UpdateInfo,
  createSubscription,
} from './echo-handler';
export * from './guarded-scope';
export * from './hypergraph';
export * from './proxy-db';
export * from './query';
export * from './registry';
export * from './serialized-space';
export * from './serializer';
export * from './text';
export * from './util';
