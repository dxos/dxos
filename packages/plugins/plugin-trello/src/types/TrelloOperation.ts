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
 * Discovery only — list Trello boards reachable from a connection's token.
 *
 * Read-only: returns one descriptor per remote board, NEVER creates a local
 * Kanban. Local Kanbans are materialized eagerly when a binding is created
 * (see `materializeTarget`), so unselected boards leave no trace in the space.
 */
export const GetTrelloBoards = Operation.make({
  meta: {
    key: makeKey('getTrelloBoards'),
    name: 'Get Trello Boards',
    description: 'List Trello boards reachable from a connection without materializing local Kanbans.',
    icon: 'ph--kanban--regular',
  },
  input: GetSyncTargetsInput,
  output: GetSyncTargetsOutput,
  // TODO(wittjosiah): declare `services: [Database.Service]` once composer's
  //   OperationInvoker is wired with a `databaseResolver`. Today, declaring it
  //   forces DynamicRuntime validation to fail before the handler runs because
  //   the managed runtime doesn't carry per-space Database. The handler
  //   provides `Database.layer(db)` itself.
});

/**
 * Bidirectional reconcile of a single Trello board bound by a {@link SyncBinding}.
 *
 * Does **not** discover boards. Pulls cards from Trello into local Expando cards
 * (keyed by foreign id), pushes locally-created and locally-edited cards back to
 * Trello, and updates the binding's `lastSyncAt`/`lastError`.
 */
export const SyncTrelloBoard = Operation.make({
  meta: {
    key: makeKey('syncTrelloBoard'),
    name: 'Sync Trello Board',
    description: 'Reconcile cards for the Trello board bound by a SyncBinding.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    binding: Ref.Ref(SyncBinding.SyncBinding),
  }),
  output: Schema.Struct({
    pulled: Schema.Struct({
      added: Schema.Number,
      updated: Schema.Number,
      removed: Schema.Number,
    }),
    pushed: Schema.Struct({
      created: Schema.Number,
      updated: Schema.Number,
    }),
  }),
  // TODO(wittjosiah): same as GetTrelloBoards above — declare
  //   `services: [Database.Service]` once the OperationInvoker has a
  //   `databaseResolver`. Handler provides the layer itself for now.
});
