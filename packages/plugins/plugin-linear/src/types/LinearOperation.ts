//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Obj, Ref, DXN } from '@dxos/echo';
import { GetSyncTargetsInput, GetSyncTargetsOutput, Integration } from '@dxos/plugin-integration';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.id}.operation.${name}`);

/**
 * Discovery only — list Linear teams reachable from the integration's token.
 * Returns one descriptor per team across the user's workspace. Read-only:
 * NEVER materializes local objects. Materialization happens lazily in
 * `SyncLinearTeams` on first sync of a target.
 */
export const GetLinearTeams = Operation.make({
  meta: {
    key: makeKey('getLinearTeams'),
    name: 'Get Linear Teams',
    description: 'List Linear teams reachable from an integration without materializing local objects.',
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
 * Reconcile Linear data for currently-selected team targets in an Integration.
 *
 * Pull-only. For each selected team: upsert the team's projects as Project
 * objects, upsert issues as Tasks (respecting `maxDaysBack` if set), update
 * per-target `lastSyncAt`/`lastError`. Does not modify `integration.targets`
 * membership. Comments are intentionally skipped in v1 (see sync.ts).
 */
export const SyncLinearTeams = Operation.make({
  meta: {
    key: makeKey('syncLinearTeams'),
    name: 'Sync Linear Teams',
    description: 'Reconcile selected Linear teams — projects and issues.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
    /** Optional: narrow to a single target Project (the local root for a Linear team). */
    team: Ref.Ref(Obj.Unknown).pipe(Schema.optional),
  }),
  output: Schema.Struct({
    pulled: Schema.Struct({
      teams: Schema.Number,
      projects: Schema.Number,
      tasks: Schema.Number,
    }),
  }),
});
