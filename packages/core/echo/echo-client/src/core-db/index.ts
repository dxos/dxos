//
// Copyright 2023 DXOS.org
//

export * from './object-core';

// TODO(wittjosiah): Vitest fails without explicit exports here.
export {
  DocAccessor,
  TargetKey,
  type AddCoreOptions,
  type AtomicReplaceObjectProps,
  type DecodedAutomergePrimaryValue,
  type DocumentChanges,
  type GetObjectCoreByIdOptions,
  type IDocHandle,
  type InitRootProxyFn,
  type ItemsUpdatedEvent,
  type KeyPath,
  type LoadObjectDocumentOptions,
  type LoadObjectOptions,
  type SpaceDocumentHeads,
  isValidKeyPath,
} from './types';
