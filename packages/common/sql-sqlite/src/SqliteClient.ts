//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

export * from '@effect/sql-sqlite-wasm/SqliteClient';

export type { OpfsConfig } from './internal/opfs-client';
export { layerOpfs, makeOpfs } from './internal/opfs-client';
