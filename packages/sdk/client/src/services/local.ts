//
// Copyright 2026 DXOS.org
//

// The in-process (same-thread) client services host.
//
// Its own entry point, deliberately NOT re-exported from `./services` or the package root: it
// statically reaches the whole service runtime — echo-host, network-manager, teleport, sqlite,
// hypercore — and the root barrel is loaded by every main-thread bundle. `createClientServices`
// reaches it through a dynamic `import()` for exactly that reason, which a static re-export
// alongside would silently undo (measured: +1.6 MB on Composer's eager boot graph).
//
// Import this only where the in-process host is the point: the recovery page, tests, and
// testing harnesses.

export { LocalClientServices, type LocalClientServicesParams, fromHost } from './local-client-services.ts';
