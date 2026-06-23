//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Ref, DXN } from '@dxos/echo';
import {
  GetSyncTargetsInput,
  GetSyncTargetsOutput,
  MaterializeTargetInput,
  MaterializeTargetOutput,
  SyncBinding,
} from '@dxos/plugin-connector';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Discovery only — list GitHub repositories the connection's token can see.
 * Returns one descriptor per repo across all the user's orgs (and personal
 * account). Read-only: NEVER materializes local objects — materialization is
 * handled by the connector's `materializeTarget` when a `SyncBinding` is created.
 *
 * Orgs and their members are NOT presented as sync targets — they are
 * auto-synced as part of the sync of any repo they own.
 */
export const GetGitHubRepositories = Operation.make({
  meta: {
    key: makeKey('getGithubRepositories'),
    name: 'Get GitHub Repositories',
    description: 'List GitHub repositories reachable from a connection without materializing local objects.',
    icon: 'ph--github-logo--regular',
  },
  input: GetSyncTargetsInput,
  output: GetSyncTargetsOutput,
});

/**
 * Find-or-create the empty local root Project for a selected GitHub repo so a
 * {@link SyncBinding} relation can be created eagerly (relations require both
 * endpoints to exist). Keyed by the repo's GitHub foreign id (`remoteTarget.id`),
 * so it is idempotent across re-selection.
 */
export const MaterializeGitHubTarget = Operation.make({
  meta: {
    key: makeKey('materializeGithubTarget'),
    name: 'Materialize GitHub Target',
    description: 'Create the empty local root Project bound to a selected GitHub repository.',
    icon: 'ph--github-logo--regular',
  },
  input: MaterializeTargetInput,
  output: MaterializeTargetOutput,
});

/**
 * Per-target options. `maxDaysBack` caps how far back issues/PRs are pulled
 * (mirrors the Gmail mailbox `daysBack`). Default — when unset — is "sync
 * everything ever opened or edited."
 */
export const SyncOptions = Schema.Struct({
  maxDaysBack: Schema.Number.annotations({
    title: 'Sync history (days)',
    description: 'Pull issues and PRs updated within this many days. Leave empty to sync everything.',
  }).pipe(Schema.optional),
});

export interface SyncOptions extends Schema.Schema.Type<typeof SyncOptions> {}

/**
 * Reconcile GitHub data for one {@link SyncBinding} (one repo).
 *
 * Pull-then-push for the bound repo: auto-upsert its owning org + members,
 * three-way merge the repo as a Project and its issues/PRs as Tasks (respecting
 * `maxDaysBack` if set), then push diverged Project/Task fields back to GitHub.
 * Sync state (`lastSyncAt`/`lastError`/`snapshots`) is written onto the binding.
 */
export const SyncGitHubRepositories = Operation.make({
  meta: {
    key: makeKey('syncGithubRepositories'),
    name: 'Sync GitHub Repositories',
    description: 'Reconcile one bound GitHub repo plus its owning org, members, issues, PRs, and comments.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    binding: Ref.Ref(SyncBinding.SyncBinding),
  }),
  output: Schema.Struct({
    pulled: Schema.Struct({
      organizations: Schema.Number,
      people: Schema.Number,
      projects: Schema.Number,
      tasks: Schema.Number,
      comments: Schema.Number,
    }),
  }),
}).pipe(Operation.visible);
