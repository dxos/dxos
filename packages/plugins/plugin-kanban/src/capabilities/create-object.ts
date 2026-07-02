//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { ViewModel } from '@dxos/schema';

import { CreateKanbanSchema, Kanban } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Kanban.Kanban),
      inputSchema: CreateKanbanSchema,
      createObject: (props, options) =>
        Effect.gen(function* () {
          const object = yield* Effect.promise(async () => {
            if (props.typename) {
              const { view } = await ViewModel.makeFromDatabase({
                db: options.db,
                typename: props.typename,
                pivotFieldName: props.initialPivotColumn,
              });
              return Kanban.make({ name: props.name, view });
            }
            return Kanban.makeItems({ name: props.name, pivotField: props.initialPivotColumn ?? '' });
          });
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: options.target,
            targetNodeId: options.targetNodeId,
          });
        }),
    });
  }),
);
