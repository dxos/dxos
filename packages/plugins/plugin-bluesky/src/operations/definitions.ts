//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Ref, DXN } from '@dxos/echo';
import { GetSyncTargetsInput, GetSyncTargetsOutput, Integration } from '@dxos/plugin-integration';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.id}.operation.${name}`);

/**
 * Discovery — list the available Bluesky sync targets for the integration's
 * authenticated user. Always returns the three "self" targets (posts,
 * likes, bookmarks) plus one entry per saved feed in the user's preferences.
 *
 * Read-only: returns descriptors only. Local Subscription.Feed objects are
 * materialized lazily on first sync (in {@link SyncBlueskyTargets}).
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
 * Pull-only sync of currently-selected Bluesky targets. For each target
 * fetches posts via XRPC (public for the user's own feed; via Edge atproto
 * proxy for `getActorLikes` / `getBookmarks` / `getFeed`) and appends new
 * Posts to the backing `Subscription.Feed` queue. On first sync a
 * `Subscription.Feed` is materialized and stored in `target.object`.
 */
export const SyncBlueskyTargets = Operation.make({
  meta: {
    key: makeKey('syncBlueskyTargets'),
    name: 'Sync Bluesky',
    description: 'Pull posts for currently-selected Bluesky targets in an Integration.',
    icon: 'ph--arrows-clockwise--regular',
  },
  // Handler resolves the Composer `Client` via `Capability.get`.
  services: [Capability.Service],
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
  }),
  output: Schema.Struct({
    /** Total posts appended across all selected targets. */
    appended: Schema.Number,
    /** Targets that produced an error this run. */
    failed: Schema.Number,
  }),
});
