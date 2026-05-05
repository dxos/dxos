//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { Integration } from '@dxos/plugin-integration/types';

import { meta } from '#meta';

const GITHUB_OPERATION = `${meta.id}.operation`;

/** Wire-shape of a `RemoteTarget` for `GetGitHubOrganizations.output`. */
const RemoteTarget = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String.pipe(Schema.optional),
});

/**
 * Discovery only — list GitHub organizations reachable from the integration's
 * token. Read-only: returns one descriptor per remote org, NEVER creates a
 * local Organization. Materialization happens lazily in
 * `SyncGitHubOrganization` on first sync of a target.
 */
export const GetGitHubOrganizations = Operation.make({
  meta: {
    key: `${GITHUB_OPERATION}.get-github-organizations`,
    name: 'Get GitHub Organizations',
    description: 'List GitHub organizations reachable from an integration without materializing local objects.',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
  }),
  output: Schema.Struct({
    targets: Schema.Array(RemoteTarget),
  }),
});

/**
 * Reconcile GitHub data for currently-selected org targets in an Integration.
 *
 * Pull-only for orgs, members, repos, and issue/PR comments. Bidirectional for
 * issues and PRs (both materialize as `Task` objects): pulls remote changes,
 * pushes locally-edited title/body/state back to GitHub. Updates per-target
 * `lastSyncAt`/`lastError`. Does **not** discover orgs or modify
 * `integration.targets` membership.
 */
export const SyncGitHubOrganization = Operation.make({
  meta: {
    key: `${GITHUB_OPERATION}.sync-github-organization`,
    name: 'Sync GitHub Organization',
    description: 'Reconcile members, repos, issues, PRs, and comments for selected GitHub org targets.',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
    /** Optional: narrow to a single target Organization. */
    organization: Ref.Ref(Obj.Unknown).pipe(Schema.optional),
  }),
  output: Schema.Struct({
    pulled: Schema.Struct({
      organizations: Schema.Number,
      people: Schema.Number,
      projects: Schema.Number,
      tasks: Schema.Number,
      comments: Schema.Number,
    }),
    pushed: Schema.Struct({
      tasks: Schema.Number,
    }),
  }),
});
