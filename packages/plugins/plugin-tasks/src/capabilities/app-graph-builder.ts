//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Obj } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { Task, TaskSet } from '@dxos/types';

import { QUICK_ENTRY_DIALOG, meta } from '#meta';
import { OutlineOperation } from '#types';

const matchTaskSet = (node: AppGraphNode.Node) =>
  Obj.instanceOf(TaskSet.TaskSet, node.data) ? Option.some(node.data) : Option.none();

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'quickEntry',
        match: GraphNodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            AppGraphNode.makeAction({
              id: OutlineOperation.QuickJournalEntry.meta.key,
              data: Effect.fnUntraced(function* () {
                yield* Operation.invoke(LayoutOperation.UpdateDialog, {
                  subject: QUICK_ENTRY_DIALOG,
                  blockAlign: 'start',
                });
              }),
              properties: {
                label: ['quick-entry.label', { ns: meta.profile.key }],
                icon: 'ph--calendar-plus--regular',
              },
            }),
          ]),
      }),

      // Hidden, so `…/<taskSetId>/<taskId>` resolves for the detail a row opens without listing tasks in the nav tree.
      AppGraphBuilder.createExtension({
        id: 'taskSetTasks',
        match: matchTaskSet,
        connector: (taskSet, get) => {
          const db = Obj.getDatabase(taskSet);
          if (!db) {
            return Effect.succeed([]);
          }

          const tasks = get(db.query(Filter.and(Filter.type(Task.Task), Filter.childOf(taskSet))).atom);
          return Effect.succeed(
            tasks
              .map((task) => AppNode.makeObject({ get, db, object: task, disposition: 'hidden' }))
              .filter((node): node is NonNullable<typeof node> => node !== null),
          );
        },
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
