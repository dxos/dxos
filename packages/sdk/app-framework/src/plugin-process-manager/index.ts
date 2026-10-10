//
// Copyright 2025 DXOS.org
//

export * from './history/index.ts';
// The process registry's own storage. Exported so a plugin wiring another durable store over the
// same data — the remote command queue — persists into it rather than opening a second database.
export * as ProcessManagerPlugin from './ProcessManagerPlugin.ts';
