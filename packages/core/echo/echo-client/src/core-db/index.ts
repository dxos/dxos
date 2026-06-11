//
// Copyright 2023 DXOS.org
//

export * from './core-database';
export * from './object-core';

// TODO(wittjosiah): Vitest fails without explicit exports here.
export { DocAccessor, type DecodedAutomergePrimaryValue, type IDocHandle, type KeyPath, isValidKeyPath } from './types';
