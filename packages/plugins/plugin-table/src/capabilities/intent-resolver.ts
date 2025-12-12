//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import {
  Capabilities,
  LayoutAction,
  type PluginContext,
  contributes,
  createIntent,
  createResolver,
} from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Table } from '@dxos/react-ui-table/types';
import { View, getTypenameFromQuery } from '@dxos/schema';
import { Task } from '@dxos/types';

import { TableAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: TableAction.OnCreateSpace,
      resolve: ({ space }) =>
        Effect.gen(function* () {
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          const { object } = yield* dispatch(
            createIntent(TableAction.Create, { db: space.db, typename: Task.Task.typename }),
          );
          space.db.add(object);
          space.properties.staticRecords = [Task.Task.typename];
        }),
    }),
    createResolver({
      intent: TableAction.OnSchemaAdded,
      resolve: ({ db, schema, show = true }) =>
        Effect.gen(function* () {
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          const { object } = yield* dispatch(
            createIntent(TableAction.Create, { db, typename: Type.getTypename(schema) }),
          );
          yield* dispatch(createIntent(SpaceAction.AddObject, { target: db, object, hidden: true }));

          if (show) {
            return {
              intents: [createIntent(LayoutAction.Open, { part: 'main', subject: [Obj.getDXN(object).toString()] })],
            };
          }
        }),
    }),
    createResolver({
      intent: TableAction.Create,
      resolve: async ({ db, name, typename }) => {
        const { view, jsonSchema } = await View.makeFromDatabase({ db, typename });
        const table = Table.make({ name, view, jsonSchema });
        return { data: { object: table } };
      },
    }),
    createResolver({
      intent: TableAction.AddRow,
      resolve: async ({ view, data }) => {
        const db = Obj.getDatabase(view);
        invariant(db);
        const typename = view.query ? getTypenameFromQuery(view.query.ast) : undefined;
        invariant(typename);
        const schema = await db.schemaRegistry.query({ typename }).firstOrUndefined();
        invariant(schema);
        const object = Obj.make(schema, data);
        return { intents: [createIntent(SpaceAction.AddObject, { target: db, object, hidden: true })] };
      },
    }),
  ]);
