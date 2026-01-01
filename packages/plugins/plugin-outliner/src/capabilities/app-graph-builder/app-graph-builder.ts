//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Common } from '@dxos/app-framework';
import { Obj, Relation } from '@dxos/echo';
import { SystemTypeAnnotation } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { GraphBuilder } from '@dxos/plugin-graph';
import { HasSubject } from '@dxos/types';

import { meta } from '../../meta';
import { OutlineOperation } from '../../types';

export default Capability.makeModule((context) =>
  Effect.sync(() => {
    return Capability.contributes(
      Common.Capability.AppGraphBuilder,
      GraphBuilder.createExtension({
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
          return [
            /**
             * Menu item to create new Outline object with a relation to the existing object.
             */
            {
              id: `${OutlineOperation.CreateOutline.meta.key}/${id}`,
              properties: {
                label: ['create outline label', { ns: meta.id }],
                icon: 'ph--tree-structure--regular',
                disposition: 'list-item',
              },
              data: async () => {
                invariant(db);
                const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
                const { data } = await invokePromise(OutlineOperation.CreateOutline, {});
                if (data?.object) {
                  db.add(data.object);
                  db.add(
                    Relation.make(HasSubject.HasSubject, {
                      [Relation.Source]: data.object,
                      [Relation.Target]: object,
                      completedAt: new Date().toISOString(),
                    }),
                  );
                }
              },
            },
          ];
        },
      }),
    );
  }),
);
