//
// Copyright 2026 DXOS.org
//

/**
 * The public surface for the binding between a local object and the remote feed a `Connection` syncs
 * into it. Exposed as its own subpath because the root entrypoint pulls in the plugin's meta, hooks,
 * operations and UI, none of which a consumer of one predicate wants; everything not re-exported here
 * is internal to the plugin.
 */

export { autoBindSingleConnection } from './util/auto-bind';
export { isCursorForTarget } from './util/cursor-predicates';
export { type LiveBinding, findBindingForTarget, findLiveBinding } from './util/find-binding';
export { createSyncRoutine } from './util/sync-routine';
export { syncTarget } from './util/sync-target';
export { connectorIdsForTarget } from './util/target-connectors';
