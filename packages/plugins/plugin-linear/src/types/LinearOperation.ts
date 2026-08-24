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
 * Discovery only — list Linear teams reachable from the connection's token.
 * Returns one descriptor per team across the user's workspace. Read-only:
 * NEVER materializes local objects. Materialization happens through
 * `materializeTarget` when a binding is created.
 */
export const GetLinearTeams = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.linear.getTeams'),
    name: 'Get Linear Teams',
    description: 'List Linear teams reachable from a connection without materializing local objects.',
    icon: 'ph--users--regular',
  },
  input: ConnectorSpec.GetSyncTargetsInput,
  output: ConnectorSpec.GetSyncTargetsOutput,
});

/**
 * Find-or-create the empty local root Project for a Linear team so an
 * external-sync cursor can be created eagerly. Idempotent: keyed by the
 * team's `LINEAR_SOURCE` foreign id (`remoteTarget.id`), it returns the existing
 * Project when one already carries that key. The team's projects and issues are
 * pulled under it on sync; here we only stamp the foreign key + a display name.
 */
export const MaterializeLinearTarget = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.linear.materializeTarget'),
    name: 'Materialize Linear Target',
    description: 'Create the empty local root Project bound to a selected Linear team.',
    icon: 'ph--users--regular',
  },
  input: ConnectorSpec.MaterializeTargetInput,
  output: ConnectorSpec.MaterializeTargetOutput,
});

/**
 * Per-target options. `maxDaysBack` caps how far back issues are pulled by
 * `Issue.updatedAt`. Default — when unset — is "sync everything in the team."
 */
export const SyncOptions = Schema.Struct({
  maxDaysBack: Schema.Number.annotate({
    title: 'Sync history (days)',
    description: 'Pull issues updated within this many days. Leave empty to sync everything.',
  }).pipe(Schema.optional),
});

export interface SyncOptions extends Schema.Schema.Type<typeof SyncOptions> {}

/**
 * Reconcile Linear data for every team bound to a connection (one external-sync
 * external-sync cursor per team).
 *
 * Each binding's `spec.source` is the connection's access token that authenticates the sync;
 * its `spec.target` is the team's local root Project; its `spec.externalId` is the Linear
 * team UUID. Bidirectional (pull-then-push): upsert the team's projects as
 * Project objects, upsert issues as Tasks (respecting `maxDaysBack` if set),
 * push diverged local edits back, then record `lastTick`/`lastError` and
 * per-id snapshots on the binding. Comments are intentionally skipped in v1
 * (see sync.ts).
 */
export const SyncLinearTeams = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.linear.syncTeams'),
    name: 'Sync Linear Teams',
    description: 'Reconcile every bound Linear team — projects and issues.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: ConnectorSpec.SyncInput,
  output: Schema.Struct({
    pulled: Schema.Struct({
      teams: Schema.Number,
      projects: Schema.Number,
      tasks: Schema.Number,
    }),
  }),
}).pipe(Operation.visible);
