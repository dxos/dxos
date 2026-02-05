//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Common } from '@dxos/app-framework';
import { Obj, Relation } from '@dxos/echo';
import { SystemTypeAnnotation } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { GraphBuilder } from '@dxos/plugin-graph';
import { HasSubject } from '@dxos/types';

import { meta } from '../../meta';
import { OutlineOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* GraphBuilder.createExtension({
      id: `${meta.id}/root`,
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
        const id = Obj.getDXN(object).toString();
        const db = Obj.getDatabase(object);
        return Effect.succeed([
          {
            id: `${OutlineOperation.CreateOutline.meta.key}/${id}`,
            properties: {
              label: ['create outline label', { ns: meta.id }],
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
          },
        ]);
      },
    });

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
