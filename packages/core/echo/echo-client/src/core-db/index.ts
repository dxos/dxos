//
// Copyright 2023 DXOS.org
//

export { type BranchStore } from './branching';
export * from './entity-manager';
export * from './object-core';

// TODO(wittjosiah): Vitest fails without explicit exports here.
export {
  type AddCoreOptions,
  type AtomicReplaceObjectProps,
  type DecodedAutomergePrimaryValue,
  type DocumentChanges,
  type GetObjectCoreByIdOptions,
  type InitRootProxyFn,
  type ItemsUpdatedEvent,
  type LoadObjectDocumentOptions,
  type LoadObjectOptions,
  type SpaceDocumentHeads,
  TargetKey,
} from './types';
