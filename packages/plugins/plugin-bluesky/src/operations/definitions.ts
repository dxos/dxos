//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Ref, DXN } from '@dxos/echo';
import { GetSyncTargetsInput, GetSyncTargetsOutput, SyncBinding } from '@dxos/plugin-connector';

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
 * Pull-only sync of a single Bluesky feed bound by a {@link SyncBinding}.
 * Fetches posts via XRPC (public for the user's own feed; via Edge atproto
 * proxy for `getActorLikes` / `getBookmarks` / `getFeed`) and appends new
 * Posts to the backing `Subscription.Feed` queue (the binding's target).
 * Updates the binding's `cursor` / `lastSyncAt` / `lastError`.
 */
export const SyncBlueskyTargets = Operation.make({
  meta: {
    key: makeKey('syncBlueskyTargets'),
    name: 'Sync Bluesky',
    description: 'Pull posts for the Bluesky feed bound by a SyncBinding.',
    icon: 'ph--arrows-clockwise--regular',
  },
  // Handler resolves the Composer `Client` via `Capability.get`.
  services: [Capability.Service],
  input: Schema.Struct({
    binding: Ref.Ref(SyncBinding.SyncBinding),
  }),
  output: Schema.Struct({
    /** Total posts appended for this binding's target. */
    appended: Schema.Number,
  }),
});
