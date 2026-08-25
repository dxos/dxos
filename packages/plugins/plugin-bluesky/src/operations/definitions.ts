//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/echo';
// Referenced in the emitted .d.ts of the operations (via `ConnectorSpec`'s schemas); importing it
// lets TypeScript name it (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

/**
 * Discovery — list the available Bluesky sync targets reachable from a
 * connection's token. Always returns the three "self" targets (posts, likes,
 * bookmarks) plus one entry per saved feed in the user's preferences.
 *
 * Read-only: returns descriptors only. Local Subscription.Feed roots are
 * materialized eagerly when a binding is created (see `materializeTarget`),
 * so unselected feeds leave no trace in the space.
 */
export const GetBlueskyTargets = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.bluesky.getTargets'),
    name: 'Get Bluesky Targets',
    description: "List the user's Bluesky timeline / likes / bookmarks plus saved custom feeds.",
    icon: 'ph--butterfly--regular',
  },
  // Handler resolves the Composer `Client` via `Capability.get`.
  services: [Capability.Service],
  input: ConnectorSpec.GetSyncTargetsInput,
  output: ConnectorSpec.GetSyncTargetsOutput,
});

/**
 * Find-or-create the empty local `Subscription.Feed` root for a selected
 * Bluesky target so the sync cursor's target exists before the cursor is
 * created. Keyed by the target's `remoteId` foreign key, so it is idempotent
 * across re-selection.
 */
export const MaterializeBlueskyTarget = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.bluesky.materializeTarget'),
    name: 'Materialize Bluesky Target',
    description: 'Create the empty local Subscription feed bound to a selected Bluesky target.',
    icon: 'ph--butterfly--regular',
  },
  input: ConnectorSpec.MaterializeTargetInput,
  output: ConnectorSpec.MaterializeTargetOutput,
});

/**
 * Pull-only sync of every Bluesky target bound to a connection. Fans out over
 * the connection's sync cursors, fetching posts via XRPC (public for the
 * user's own feed; via Edge atproto proxy for `getActorLikes` /
 * `getBookmarks` / `getFeed`) and appending new Posts to each backing
 * `Subscription.Feed` queue (the cursor's target). Updates each cursor's
 * `value` / `lastTick` / `lastError`.
 */
export const SyncBlueskyTargets = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.bluesky.syncTargets'),
    name: 'Sync Bluesky',
    description: 'Pull posts for every Bluesky target bound to a connection.',
    icon: 'ph--arrows-clockwise--regular',
  },
  // Handler resolves the Composer `Client` via `Capability.get`.
  services: [Capability.Service],
  input: ConnectorSpec.SyncInput,
  output: Schema.Struct({
    /** Total posts appended across the connection's targets. */
    appended: Schema.Number,
  }),
}).pipe(Operation.visible);
