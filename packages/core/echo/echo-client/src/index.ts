//
// Copyright 2020 DXOS.org
//

export { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';

export * from './automerge';
export * from './client';
export {
  type AddCoreOptions,
  type AtomicReplaceObjectProps,
  type BindOptions,
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
  checkoutVersion,
  clone,
  createArrayMethodError,
  createObject,
  createPropertyDeleteError,
  createPropertySetError,
  createSubscription,
  findObjectWithForeignKey,
  getDXNWithSpaceKey,
  getEditHistory,
  getObjectCore,
  getVersion,
  initEchoReactiveObjectRootProxy,
  isEchoObject,
  matchKeys,
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
