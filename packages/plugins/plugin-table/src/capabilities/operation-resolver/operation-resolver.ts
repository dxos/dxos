//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Operation, OperationResolver } from '@dxos/operation';
import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { Table } from '@dxos/react-ui-table/types';
import { View, getTypenameFromQuery } from '@dxos/schema';
import { Task } from '@dxos/types';

import { TableOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const context = yield* Capability.PluginContextService;

    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: TableOperation.OnCreateSpace,
        handler: ({ space }) =>
          Effect.gen(function* () {
            const { object } = yield* Operation.invoke(TableOperation.Create, {
              db: space.db,
              typename: Task.Task.typename,
            });
            space.db.add(object);
            space.properties.staticRecords = [Task.Task.typename];
          }),
      }),
      OperationResolver.make({
        operation: TableOperation.OnSchemaAdded,
        handler: ({ db, schema, show = true }) =>
          Effect.gen(function* () {
            const { object } = yield* Operation.invoke(TableOperation.Create, {
              db,
              typename: Type.getTypename(schema),
            });
            yield* Operation.invoke(SpaceOperation.AddObject, { target: db, object, hidden: true });

            if (show) {
              yield* Operation.invoke(Common.LayoutOperation.Open, {
                subject: [Obj.getDXN(object).toString()],
              });
            }
          }).pipe(Effect.provideService(Capability.PluginContextService, context)),
      }),
      OperationResolver.make({
        operation: TableOperation.Create,
        handler: ({ db, name, typename }) =>
          Effect.gen(function* () {
            const { view, jsonSchema } = yield* Effect.promise(() => View.makeFromDatabase({ db, typename }));
            const table = Table.make({ name, view, jsonSchema });
            return { object: table };
          }),
      }),
      // TODO(wittjosiah): This appears to be unused.
      OperationResolver.make({
        operation: TableOperation.AddRow,
        handler: ({ view, data }) =>
          Effect.gen(function* () {
            const db = Obj.getDatabase(view);
            invariant(db);
            const typename = view.query ? getTypenameFromQuery(view.query.ast) : undefined;
            invariant(typename);
            const schema = yield* Effect.promise(() => db.schemaRegistry.query({ typename }).firstOrUndefined());
            invariant(schema);
            const object = Obj.make(schema, data);
            yield* Operation.invoke(SpaceOperation.AddObject, { target: db, object, hidden: true });
          }),
      }),
    ]);
  }),
);
