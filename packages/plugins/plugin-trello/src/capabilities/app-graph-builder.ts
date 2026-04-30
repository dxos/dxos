//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { getSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/operation';
import { GraphBuilder } from '@dxos/plugin-graph';
import { Integration } from '@dxos/plugin-integration/types';
import { Kanban } from '@dxos/plugin-kanban/types';

import { meta } from '#meta';

import { TRELLO_SOURCE } from '../constants';
import { SyncTrelloBoard } from '../operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // "Sync now" action on Trello-typed Integration nodes.
      GraphBuilder.createExtension({
        id: 'trello-sync-integration',
        match: (node) => {
          if (!Integration.instanceOf(node.data)) return Option.none();
          const integration = node.data as Integration.Integration;
          const accessToken = integration.accessToken.target;
          if (!accessToken || accessToken.source !== TRELLO_SOURCE) return Option.none();
          return Option.some(integration);
        },
        actions: (integration) =>
          Effect.succeed([
            {
              id: 'trello-sync-now',
              data: () => Operation.invoke(SyncTrelloBoard, { integration: Ref.make(integration) }),
              properties: {
                label: ['sync now.label', { ns: meta.id }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
          ]),
      }),

      // "Sync this board" action on each Trello-keyed items-Kanban.
      GraphBuilder.createExtension({
        id: 'trello-sync-board',
        match: (node) => {
          if (!Obj.instanceOf(Kanban.Kanban, node.data)) return Option.none();
          const kanban = node.data as Kanban.Kanban;
          if (kanban.spec.kind !== 'items') return Option.none();
          const foreignId = Obj.getMeta(kanban).keys.find((k) => k.source === TRELLO_SOURCE)?.id;
          if (!foreignId) return Option.none();
          return Option.some(kanban);
        },
        actions: (kanban) =>
          Effect.succeed([
            {
              id: 'trello-sync-this-board',
              data: () =>
                Effect.gen(function* () {
                  const space = getSpace(kanban);
                  if (!space) return;
                  // Find the parent Integration whose targets include this kanban.
                  // Compare by echo id, not full DXN string — stored refs use the
                  // space-relative form (`dxn:echo:@:...`) while `Obj.getDXN(kanban)`
                  // returns the absolute form, so a string compare always misses.
                  const integrations = yield* Effect.promise(() =>
                    space.db.query(Filter.type(Integration.Integration)).run(),
                  );
                  const parent = integrations.find((integration) =>
                    integration.targets.some(
                      (target) => target.object.dxn.asEchoDXN()?.echoId === kanban.id,
                    ),
                  );
                  if (!parent) return;
                  yield* Operation.invoke(SyncTrelloBoard, {
                    integration: Ref.make(parent),
                    kanban: Ref.make(kanban),
                  });
                }),
              properties: {
                label: ['sync this board.label', { ns: meta.id }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
