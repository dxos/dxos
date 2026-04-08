//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Obj, Relation } from '@dxos/echo';
import { SystemTypeAnnotation } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { HasSubject } from '@dxos/types';

import { QUICK_ENTRY_DIALOG, meta } from '#meta';
import { OutlineOperation } from '#operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'root',
        match: (node) => {
          if (!Obj.isObject(node.data)) {
            return Option.none();
          }

          const schema = Obj.getSchema(node.data);
          const system = Option.fromNullable(schema).pipe(
            Option.flatMap((schema) => SystemTypeAnnotation.get(schema)),
            Option.getOrElse(() => false),
          );
          if (system) {
            return Option.none();
          }

          return Option.some(node.data);
        },
        actions: (object) => {
          const db = Obj.getDatabase(object);
          return Effect.succeed([
            Node.makeAction({
              id: OutlineOperation.CreateOutline.meta.key,
              properties: {
                label: ['create-outline.label', { ns: meta.id }],
                icon: 'ph--tree-structure--regular',
                disposition: 'list-item',
              },
              data: Effect.fnUntraced(function* () {
                invariant(db);
                const result = yield* Operation.invoke(OutlineOperation.CreateOutline, {});
                if (result?.object) {
                  db.add(result.object);
                  db.add(
                    Relation.make(HasSubject.HasSubject, {
                      [Relation.Source]: result.object,
                      [Relation.Target]: object,
                      completedAt: new Date().toISOString(),
                    }),
                  );
                }
              }),
            }),
          ]);
        },
      }),
      GraphBuilder.createExtension({
        id: 'quick-entry',
        match: NodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed([
            Node.makeAction({
              id: OutlineOperation.QuickJournalEntry.meta.key,
              data: Effect.fnUntraced(function* () {
                yield* Operation.invoke(LayoutOperation.UpdateDialog, {
                  subject: QUICK_ENTRY_DIALOG,
                  blockAlign: 'start',
                });
              }),
              properties: {
                label: ['quick-entry.label', { ns: meta.id }],
                icon: 'ph--calendar-plus--regular',
              },
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
