//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities } from '@dxos/plugin-space/types';
import { Table } from '@dxos/react-ui-table/types';
import { ViewModel } from '@dxos/schema';

import { CreateTableSchema } from '#operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Table.Table.typename,
      inputSchema: CreateTableSchema,
      createObject: ((props, options) =>
        Effect.gen(function* () {
          const object = yield* Effect.promise(async () => {
            const { view, jsonSchema } = await ViewModel.makeFromDatabase({
              db: options.db,
              typename: props.typename,
            });
            return Table.make({ name: props.name, view, jsonSchema });
          });
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: options.target,
            hidden: true,
            targetNodeId: options.targetNodeId,
          });
        })),
    });
  }),
);
