//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/echo';
// Referenced in the emitted .d.ts of the operations (via `ConnectorSpec`'s schemas); importing it
// lets TypeScript name it (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

/**
 * Discovery only — list GitHub repositories the connection's token can see.
 * Returns one descriptor per repo across all the user's orgs (and personal
 * account). Read-only: NEVER materializes local objects — materialization is
 * handled by the connector's `materializeTarget` when a `Cursor` is created.
 *
 * Orgs and their members are NOT presented as sync targets — they are
 * auto-synced as part of the sync of any repo they own.
 */
export const GetGitHubRepositories = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.github.getRepositories'),
    name: 'Get GitHub Repositories',
    description: 'List GitHub repositories reachable from a connection without materializing local objects.',
    icon: 'ph--github-logo--regular',
  },
  input: ConnectorSpec.GetSyncTargetsInput,
  output: ConnectorSpec.GetSyncTargetsOutput,
});

/**
 * Find-or-create the empty local root Project for a selected GitHub repo so a
 * cursor can reference it as its `spec.target`. Keyed by the repo's
 * GitHub foreign id (`remoteTarget.id`), so it is idempotent across re-selection.
 */
export const MaterializeGitHubTarget = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.github.materializeTarget'),
    name: 'Materialize GitHub Target',
    description: 'Create the empty local root Project bound to a selected GitHub repository.',
    icon: 'ph--github-logo--regular',
  },
  input: ConnectorSpec.MaterializeTargetInput,
  output: ConnectorSpec.MaterializeTargetOutput,
});

/**
 * Per-target options. `maxDaysBack` caps how far back issues/PRs are pulled
 * (mirrors the Gmail mailbox `daysBack`). Default — when unset — is "sync
 * everything ever opened or edited."
 */
export const SyncOptions = Schema.Struct({
  maxDaysBack: Schema.Number.annotate({
    title: 'Sync history (days)',
    description: 'Pull issues and PRs updated within this many days. Leave empty to sync everything.',
  }).pipe(Schema.optional),
});

export interface SyncOptions extends Schema.Schema.Type<typeof SyncOptions> {}

/**
 * Reconcile GitHub data for every repo bound to a connection (one cursor per repo).
 *
 * Pull-then-push per bound repo: auto-upsert its owning org + members,
 * three-way merge the repo as a Project and its issues/PRs as Tasks (respecting
 * `maxDaysBack` if set), then push diverged Project/Task fields back to GitHub.
 * Sync state (`lastTick`/`lastError`/`spec.snapshots`) is written onto each binding.
 */
export const SyncGitHubRepositories = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.github.syncRepositories'),
    name: 'Sync GitHub Repositories',
    description: 'Reconcile every bound GitHub repo plus its owning org, members, issues, PRs, and comments.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: ConnectorSpec.SyncInput,
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
