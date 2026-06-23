//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Obj, Ref, DXN } from '@dxos/echo';
import { GetSyncTargetsInput, GetSyncTargetsOutput, Integration } from '@dxos/plugin-integration';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Discovery only — list GitHub repositories the integration's token can see.
 * Returns one descriptor per repo across all the user's orgs (and personal
 * account). Read-only: NEVER materializes local objects. Materialization
 * happens lazily in `SyncGitHubRepositories` on first sync of a target.
 *
 * Orgs and their members are NOT presented as sync targets — they are
 * auto-synced as part of the sync of any repo they own.
 */
export const GetGitHubRepositories = Operation.make({
  meta: {
    key: makeKey('getGithubRepositories'),
    name: 'Get GitHub Repositories',
    description: 'List GitHub repositories reachable from an integration without materializing local objects.',
    icon: 'ph--github-logo--regular',
  },
  input: GetSyncTargetsInput,
  output: GetSyncTargetsOutput,
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
 * Reconcile GitHub data for currently-selected repo targets in an Integration.
 *
 * Pull-only. For each selected repo: auto-upsert its owning org + members,
 * upsert the repo as a Project, upsert issues/PRs as Tasks (respecting
 * `maxDaysBack` if set), upsert comments as Thread/Messages. Updates per-target
 * `lastSyncAt`/`lastError`. Does not modify `integration.targets` membership.
 */
export const SyncGitHubRepositories = Operation.make({
  meta: {
    key: makeKey('syncGithubRepositories'),
    name: 'Sync GitHub Repositories',
    description: 'Reconcile selected GitHub repos plus their owning orgs, members, issues, PRs, and comments.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
    /** Optional: narrow to a single target Project. */
    repository: Ref.Ref(Obj.Unknown).pipe(Schema.optional),
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
