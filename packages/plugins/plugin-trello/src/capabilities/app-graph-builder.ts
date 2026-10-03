//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Obj, Ref } from '@dxos/echo';
import { Connection, Cursor } from '@dxos/link';
import * as Binding from '@dxos/plugin-connector/Binding';
import * as Kanban from '@dxos/plugin-kanban/Kanban';

import { meta } from '#meta';
import { TrelloOperation } from '#types';

import { TRELLO_SOURCE } from '../constants.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'trelloSyncBoard',
        match: (node) => {
          if (!Obj.instanceOf(Kanban.Kanban, node.data)) {
            return Option.none();
          }
          const kanban = node.data as Kanban.Kanban;
          if (kanban.spec.kind !== 'items') {
            return Option.none();
          }
          const foreignId = Obj.getMeta(kanban).keys.find((k) => k.source === TRELLO_SOURCE)?.id;
          if (!foreignId) {
            return Option.none();
          }
          return Option.some(kanban);
        },
        actions: (kanban, get) => {
          const db = Obj.getDatabase(kanban);
          if (!db) {
            return Effect.succeed([]);
          }
          // The board's sync state lives on the external-sync `Cursor` whose
          // `spec.target` is this Kanban. Find it so the action can sync exactly
          // that binding. `Cursor` has no reverse-ref index on `spec.target`, so
          // this scans every cursor in the space and filters (mirrors
          // `@dxos/plugin-connector`'s own cursor lookups).
          const cursors = get(db.query(Filter.type(Cursor.Cursor)).atom);
          const binding = cursors.find(
            (candidate): candidate is Cursor.ExternalCursor =>
              Cursor.isExternal(candidate) && Binding.targets(candidate, kanban),
          );
          if (!binding) {
            return Effect.succeed([]);
          }
          // The sync operation is account-level: it takes the binding's connection and fans out
          // over every bound board, with this board's cursor as the priority binding.
          const connections = get(db.query(Filter.type(Connection.Connection)).atom);
          const connection = connections.find((candidate) => Binding.isForConnection(binding, candidate));
          if (!connection) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            {
              id: 'trelloSyncThisBoard',
              data: () =>
                Operation.invoke(
                  TrelloOperation.SyncTrelloBoard,
                  {
                    connection: Ref.make(connection),
                    priority: binding.id,
                  },
                  { spaceId: db.spaceId },
                ),
              properties: {
                label: ['sync-this-board.label', { ns: meta.profile.key }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
          ]);
        },
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
