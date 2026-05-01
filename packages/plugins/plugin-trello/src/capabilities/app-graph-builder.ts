//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { Operation } from '@dxos/compute';
import { GraphBuilder } from '@dxos/plugin-graph';
import { Integration } from '@dxos/plugin-integration/types';
import { Kanban } from '@dxos/plugin-kanban/types';

import { meta } from '#meta';

import { TRELLO_SOURCE } from '../constants';
import { TrelloOperation } from '../operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'trello-sync-board',
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
          const integrations = get(AtomQuery.make(db, Filter.type(Integration.Integration)));
          const integration = integrations.find((integration) =>
            integration.targets.some((target) => target.object?.dxn.asEchoDXN()?.echoId === kanban.id),
          );
          if (!integration) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            {
              id: 'trello-sync-this-board',
              data: () =>
                Operation.invoke(TrelloOperation.SyncTrelloBoard, {
                  integration: Ref.make(integration),
                  kanban: Ref.make(kanban),
                }),
              properties: {
                label: ['sync-this-board.label', { ns: meta.id }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
