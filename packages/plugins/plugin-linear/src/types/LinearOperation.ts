//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Ref, DXN } from '@dxos/echo';
import { GetSyncTargetsInput, GetSyncTargetsOutput, SyncBinding } from '@dxos/plugin-connector';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Discovery only — list Linear teams reachable from the connection's token.
 * Returns one descriptor per team across the user's workspace. Read-only:
 * NEVER materializes local objects. Materialization happens through
 * `materializeTarget` when a binding is created.
 */
export const GetLinearTeams = Operation.make({
  meta: {
    key: makeKey('getLinearTeams'),
    name: 'Get Linear Teams',
    description: 'List Linear teams reachable from a connection without materializing local objects.',
    icon: 'ph--users--regular',
  },
  input: GetSyncTargetsInput,
  output: GetSyncTargetsOutput,
});

/**
 * Per-target options. `maxDaysBack` caps how far back issues are pulled by
 * `Issue.updatedAt`. Default — when unset — is "sync everything in the team."
 */
export const SyncOptions = Schema.Struct({
  maxDaysBack: Schema.Number.annotations({
    title: 'Sync history (days)',
    description: 'Pull issues updated within this many days. Leave empty to sync everything.',
  }).pipe(Schema.optional),
});

export interface SyncOptions extends Schema.Schema.Type<typeof SyncOptions> {}

/**
 * Reconcile Linear data for one {@link SyncBinding}'s team target.
 *
 * The binding's source is the {@link Connection} that authenticates the sync;
 * its target is the team's local root Project; its `remoteId` is the Linear
 * team UUID. Bidirectional (pull-then-push): upsert the team's projects as
 * Project objects, upsert issues as Tasks (respecting `maxDaysBack` if set),
 * push diverged local edits back, then record `lastSyncAt`/`lastError` and
 * per-id snapshots on the binding. Comments are intentionally skipped in v1
 * (see sync.ts).
 */
export const SyncLinearTeams = Operation.make({
  meta: {
    key: makeKey('syncLinearTeams'),
    name: 'Sync Linear Teams',
    description: 'Reconcile one Linear team binding — projects and issues.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    binding: Ref.Ref(SyncBinding.SyncBinding),
  }),
  output: Schema.Struct({
    pulled: Schema.Struct({
      teams: Schema.Number,
      projects: Schema.Number,
      tasks: Schema.Number,
    }),
  }),
}).pipe(Operation.visible);
