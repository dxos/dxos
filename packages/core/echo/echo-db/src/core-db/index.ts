//
// Copyright 2023 DXOS.org
//

export * from './core-database';
export * from './crud-api';
export * from './object-core';
// TODO(wittjosiah): Vitest fails without explicit exports here.
export {
  DocAccessor,
  type DecodedAutomergePrimaryValue,
  type DecodedAutomergeValue,
  type IDocHandle,
  type KeyPath,
  createDocAccessor,
  isValidKeyPath,
} from './types';
