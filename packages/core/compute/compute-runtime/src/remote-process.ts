//
// Copyright 2026 DXOS.org
//

/**
 * Remote (EDGE) process control, behind a subpath rather than the package barrel.
 *
 * The barrel is reachable from Composer's eager boot graph, which is budgeted
 * (`composer-app:check-boot-budget`); these modules are only needed by a client that actually drives
 * a remote process, so they stay off that path.
 */

export * as RemoteProcessHandle from './RemoteProcessHandle';
export * as RemoteProcessManagerAdapter from './RemoteProcessManagerAdapter';
