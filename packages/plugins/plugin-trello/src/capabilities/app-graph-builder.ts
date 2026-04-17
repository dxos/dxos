//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { GraphBuilder, Node } from '@dxos/plugin-graph';

import { meta } from '#meta';
import { SyncBoard } from '#operations';
import { Trello } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'sync-board',
        match: (node) =>
          Trello.isBoard(node.data) ? Option.some(node.data) : Option.none(),
        actions: (board) =>
          Effect.succeed([
            Node.makeAction({
              id: 'sync',
              data: Effect.fnUntraced(function* () {
                const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
                const db = Obj.getDatabase(board);
                invariant(db);
                const runtime = computeRuntime.getRuntime(db.spaceId);
                yield* Effect.tryPromise(() =>
                  runtime.runPromise(
                    Operation.invoke(SyncBoard, {
                      board: Ref.make(board),
                    }),
                  ),
                ).pipe(
                  Effect.tap(() =>
                    Operation.invoke(LayoutOperation.AddToast, {
                      id: 'sync-board-success',
                      icon: 'ph--check--regular',
                      duration: 3_000,
                      title: ['sync-board-success.title', { ns: meta.id }],
                      closeLabel: ['close.label', { ns: meta.id }],
                    }),
                  ),
                  Effect.catchAll((error) => {
                    log.catch(error);
                    return Operation.invoke(LayoutOperation.AddToast, {
                      id: 'sync-board-error',
                      icon: 'ph--warning--regular',
                      duration: 5_000,
                      title: ['sync-board-error.title', { ns: meta.id }],
                      closeLabel: ['close.label', { ns: meta.id }],
                    });
                  }),
                );
              }),
              properties: {
                label: ['sync-board.label', { ns: meta.id }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
