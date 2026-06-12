//
// Copyright 2023 DXOS.org
//

export * from './entity-manager';
export * from './object-core';

// TODO(wittjosiah): Vitest fails without explicit exports here.
export {
  DocAccessor,
  TargetKey,
  type DecodedAutomergePrimaryValue,
  type IDocHandle,
  type KeyPath,
  isValidKeyPath,
} from './types';
