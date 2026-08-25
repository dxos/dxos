//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { ViewModel } from '@dxos/schema';

import { Kanban, KanbanSchema } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Kanban.Kanban),
      inputSchema: KanbanSchema.CreateKanbanSchema,
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
          return yield* Operation.invoke(
            SpaceOperation.AddObject,
            {
              object,
              target: options.target,
            },
            { spaceId: options.db.spaceId },
          );
        }),
    });
  }),
);
