//
// Copyright 2026 DXOS.org
//

/**
 * Remote (EDGE) process control, behind a subpath because the package barrel is reachable from
 * Composer's budgeted eager boot graph (`composer-app:check-boot-budget`).
 */

export * as RemoteProcessHandle from './RemoteProcessHandle';
export * as RemoteProcessInfo from './remote-process-info';
