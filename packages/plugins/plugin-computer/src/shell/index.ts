//
// Copyright 2026 DXOS.org
//

// Browser-safe entry: the wire contract and the fetch client. The host lives behind
// `./vite-plugin`, which spawns processes and reads the filesystem — nothing here may reach it.

export * as Shell from './Shell';
export * from './errors';
