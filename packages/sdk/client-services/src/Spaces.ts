//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// The space subsystem is one namespace: `internal/space` is the transport-level space and its
// manager, `internal/spaces` the data spaces above it, and `internal/space-export` their archive
// format. Separate facades produced sibling names a reader cannot tell apart.
export * from './internal/echo/space/index.ts';
export * from './internal/echo/spaces/index.ts';
export * from './internal/echo/space-export/index.ts';
