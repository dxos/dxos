//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// The stack is the composition of the subsystems, so its namespace fronts the host plus the pieces
// of each subsystem the embedder reaches for.
export * from './internal/host/index.ts';
export * from './internal/kernel/index.ts';
export * from './internal/echo/cross-device-space-synchronizer.ts';
export * from './internal/echo/feed-syncer.ts';
