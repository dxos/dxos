//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/compute';
import { Integration } from '@dxos/plugin-integration/types';

import { meta } from '#meta';

const TRELLO_OPERATION = `${meta.id}.operation`;

/** Wire-shape of a `RemoteTarget` for `GetTrelloBoards.output`. */
const RemoteTarget = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String.pipe(Schema.optional),
});

/**
 * Discovery only — list Trello boards reachable from the integration's token.
 *
 * Read-only: returns one descriptor per remote board, NEVER creates a local
 * Kanban. Materialization happens lazily in `SyncTrelloBoard` on first sync
 * of a target, so unselected boards leave no trace in the space.
 */
export const GetTrelloBoards = Operation.make({
  meta: {
    key: `${TRELLO_OPERATION}.get-trello-boards`,
    name: 'Get Trello Boards',
    description: 'List Trello boards reachable from an integration without materializing local Kanbans.',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
  }),
  output: Schema.Struct({
    targets: Schema.Array(RemoteTarget),
  }),
  // TODO(wittjosiah): declare `services: [Database.Service]` once composer's
  //   OperationInvoker is wired with a `databaseResolver`. Today, declaring it
  //   forces DynamicRuntime validation to fail before the handler runs because
  //   the managed runtime doesn't carry per-space Database. The handler
  //   provides `Database.layer(db)` itself.
});

/**
 * Bidirectional reconcile of currently-selected Trello targets in an Integration.
 *
 * Does **not** discover boards or modify `integration.targets` membership. Pulls cards
 * from Trello into local Expando cards (keyed by foreign id), pushes locally-created
 * and locally-edited cards back to Trello, and updates per-target `lastSyncAt`/`lastError`.
 */
export const SyncTrelloBoard = Operation.make({
  meta: {
    key: `${TRELLO_OPERATION}.sync-trello-board`,
    name: 'Sync Trello Board',
    description: 'Reconcile cards for currently-selected Trello targets in an Integration.',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
    /** Optional: narrow to a single target Kanban. */
    kanban: Ref.Ref(Obj.Unknown).pipe(Schema.optional),
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
