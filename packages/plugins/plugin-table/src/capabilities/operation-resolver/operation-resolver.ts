//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation, OperationResolver } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { Table } from '@dxos/react-ui-table/types';
import { View, getTypenameFromQuery } from '@dxos/schema';
import { Task } from '@dxos/types';

import { TableOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: TableOperation.OnCreateSpace,
        handler: Effect.fnUntraced(function* ({ space }) {
          const { object } = yield* Operation.invoke(TableOperation.Create, {
            db: space.db,
            typename: Task.Task.typename,
          });
          space.db.add(object);
          Obj.change(space.properties, (p) => {
            p.staticRecords = [Task.Task.typename];
          });
        }),
      }),
      OperationResolver.make({
        operation: TableOperation.OnSchemaAdded,
        handler: Effect.fnUntraced(function* ({ db, schema, show = true }) {
          const { object } = yield* Operation.invoke(TableOperation.Create, {
            db,
            typename: Type.getTypename(schema),
          });
          yield* Operation.invoke(SpaceOperation.AddObject, { target: db, object, hidden: true });

          if (show) {
            yield* Operation.invoke(LayoutOperation.Open, {
              subject: [Obj.getDXN(object).toString()],
            });
          }
        }),
      }),
      OperationResolver.make({
        operation: TableOperation.Create,
        handler: Effect.fnUntraced(function* ({ db, name, typename }) {
          const { view, jsonSchema } = yield* Effect.promise(() => View.makeFromDatabase({ db, typename }));
          const table = Table.make({ name, view, jsonSchema });
          return { object: table };
        }),
      }),
      // TODO(wittjosiah): This appears to be unused.
      OperationResolver.make({
        operation: TableOperation.AddRow,
        handler: Effect.fnUntraced(function* ({ view, data }) {
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
