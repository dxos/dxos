//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Cursor } from '@dxos/cursor';
import { DXN, Ref } from '@dxos/echo';
import {
  // eslint-disable-next-line unused-imports/no-unused-imports
  type Connection,
  GetSyncTargetsInput,
  GetSyncTargetsOutput,
  MaterializeTargetInput,
  MaterializeTargetOutput,
} from '@dxos/plugin-connector';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

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
    key: makeKey('getBlueskyTargets'),
    name: 'Get Bluesky Targets',
    description: "List the user's Bluesky timeline / likes / bookmarks plus saved custom feeds.",
    icon: 'ph--butterfly--regular',
  },
  // Handler resolves the Composer `Client` via `Capability.get`.
  services: [Capability.Service],
  input: GetSyncTargetsInput,
  output: GetSyncTargetsOutput,
});

/**
 * Find-or-create the empty local `Subscription.Feed` root for a selected
 * Bluesky target so the sync cursor's target exists before the cursor is
 * created. Keyed by the target's `remoteId` foreign key, so it is idempotent
 * across re-selection.
 */
export const MaterializeBlueskyTarget = Operation.make({
  meta: {
    key: makeKey('materializeBlueskyTarget'),
    name: 'Materialize Bluesky Target',
    description: 'Create the empty local Subscription feed bound to a selected Bluesky target.',
    icon: 'ph--butterfly--regular',
  },
  input: MaterializeTargetInput,
  output: MaterializeTargetOutput,
});

/**
 * Pull-only sync of a single Bluesky feed bound by a {@link Cursor.Cursor}.
 * Fetches posts via XRPC (public for the user's own feed; via Edge atproto
 * proxy for `getActorLikes` / `getBookmarks` / `getFeed`) and appends new
 * Posts to the backing `Subscription.Feed` queue (the cursor's target).
 * Updates the cursor's `value` / `lastRunAt` / `lastError`.
 */
export const SyncBlueskyTargets = Operation.make({
  meta: {
    key: makeKey('syncBlueskyTargets'),
    name: 'Sync Bluesky',
    description: 'Pull posts for the Bluesky feed bound by a sync cursor.',
    icon: 'ph--arrows-clockwise--regular',
  },
  // Handler resolves the Composer `Client` via `Capability.get`.
  services: [Capability.Service],
  input: Schema.Struct({
    binding: Ref.Ref(Cursor.Cursor),
  }),
  output: Schema.Struct({
    /** Total posts appended for this binding's target. */
    appended: Schema.Number,
  }),
}).pipe(Operation.visible);
