//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { isCursorForTarget } from '@dxos/plugin-connector';
import { GraphBuilder } from '@dxos/plugin-graph';
import { Kanban } from '@dxos/plugin-kanban';

import { meta } from '#meta';

import { TRELLO_SOURCE } from '../constants';
import { TrelloOperation } from '../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
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
              Cursor.isExternal(candidate) && isCursorForTarget(candidate, kanban),
          );
          if (!binding) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            {
              id: 'trelloSyncThisBoard',
              data: () =>
                Operation.invoke(
                  TrelloOperation.SyncTrelloBoard,
                  {
                    binding: Ref.make(binding),
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
