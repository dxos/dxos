//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { Integration } from '@dxos/plugin-integration/types';

import { meta } from '#meta';

const LINEAR_OPERATION = `${meta.id}.operation`;

/** Wire-shape of a `RemoteTarget` for `GetLinearTeams.output`. */
const RemoteTarget = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String.pipe(Schema.optional),
});

/**
 * Discovery only — list Linear teams reachable from the integration's token.
 * Read-only: returns one descriptor per remote team, NEVER creates a local
 * object. Materialization happens lazily in `SyncLinearTeam` on first sync.
 */
export const GetLinearTeams = Operation.make({
  meta: {
    key: `${LINEAR_OPERATION}.get-linear-teams`,
    name: 'Get Linear Teams',
    description: 'List Linear teams reachable from an integration without materializing local objects.',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
  }),
  output: Schema.Struct({
    targets: Schema.Array(RemoteTarget),
  }),
});

/**
 * Reconcile Linear data for currently-selected team targets in an Integration.
 * Pull-only: pulls Projects, Issues (as Tasks), and per-issue Comment threads.
 * Local edits to mapped Task fields are overwritten on next sync (Linear is
 * source of truth in v1).
 */
export const SyncLinearTeam = Operation.make({
  meta: {
    key: `${LINEAR_OPERATION}.sync-linear-team`,
    name: 'Sync Linear Team',
    description: 'Reconcile projects, issues, and comments for selected Linear team targets.',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
    /** Optional: narrow to a single team target. */
    team: Ref.Ref(Obj.Unknown).pipe(Schema.optional),
  }),
  output: Schema.Struct({
    pulled: Schema.Struct({
      teams: Schema.Number,
      projects: Schema.Number,
      tasks: Schema.Number,
      comments: Schema.Number,
    }),
  }),
});
