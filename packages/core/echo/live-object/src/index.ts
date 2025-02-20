//
// Copyright 2024 DXOS.org
//

export * from './proxy';
export * from './accessors';
export * from './object';
export * from './schema';
export * from './ref';

// TODO(dmaretskyi): Re-export to not update all imports. Resolve later.
export { getSchema } from '@dxos/echo-schema';
