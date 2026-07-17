//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { Table } from '@dxos/react-ui-table/types';
import { ViewModel } from '@dxos/schema';

import { TableOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.provide(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Table.Table),
        inputSchema: TableOperation.CreateTableSchema,
        createObject: (props, options) =>
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
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
