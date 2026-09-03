//
// Copyright 2026 DXOS.org
//

// Browser-safe entry. The host spawns processes and reads the filesystem, so nothing here may reach
// into `../Host` or `../Middleware` — and nothing here may import `@dxos/*` either, since this entry
// resolves separately from its consumer (see the note in `./Client`).

export * as Client from './Client.ts';
