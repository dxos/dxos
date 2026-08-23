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
 * Discovery only — list Trello boards reachable from a connection's token.
 *
 * Read-only: returns one descriptor per remote board, NEVER creates a local
 * Kanban. Local Kanbans are materialized eagerly when a binding is created
 * (see `materializeTarget`), so unselected boards leave no trace in the space.
 */
export const GetTrelloBoards = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.trello.getBoards'),
    name: 'Get Trello Boards',
    description: 'List Trello boards reachable from a connection without materializing local Kanbans.',
    icon: 'ph--kanban--regular',
  },
  input: ConnectorSpec.GetSyncTargetsInput,
  output: ConnectorSpec.GetSyncTargetsOutput,
  // TODO(wittjosiah): declare `services: [Database.Service]` once composer's
  //   OperationInvoker is wired with a `databaseResolver`. Today, declaring it
  //   forces DynamicRuntime validation to fail before the handler runs because
  //   the managed runtime doesn't carry per-space Database. The handler
  //   provides `Database.layer(db)` itself.
});

/**
 * Find-or-create the empty local Kanban for a selected Trello board so an
 * external-sync cursor can be created eagerly. Keyed by the
 * board's foreign key, so it is idempotent across re-selection.
 */
export const MaterializeTrelloTarget = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.trello.materializeTarget'),
    name: 'Materialize Trello Target',
    description: 'Create the empty local Kanban bound to a selected Trello board.',
    icon: 'ph--kanban--regular',
  },
  input: ConnectorSpec.MaterializeTargetInput,
  output: ConnectorSpec.MaterializeTargetOutput,
});

/**
 * Bidirectional reconcile of every Trello board bound to a connection (one
 * external-sync cursor per board).
 *
 * Does **not** discover boards. Pulls cards from Trello into local Expando cards
 * (keyed by foreign id), pushes locally-created and locally-edited cards back to
 * Trello, and updates each binding's `lastTick`/`lastError`.
 */
export const SyncTrelloBoard = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.trello.syncBoard'),
    name: 'Sync Trello Board',
    description: 'Reconcile cards for every Trello board bound to a connection.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: ConnectorSpec.SyncInput,
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
}).pipe(Operation.visible);
