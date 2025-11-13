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
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceAction } from '@dxos/plugin-space/types';
import { getSpace } from '@dxos/react-client/echo';
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
          const { object } = yield* dispatch(createIntent(TableAction.Create, { space, typename: Task.Task.typename }));
          space.db.add(object);
          space.properties.staticRecords = [Task.Task.typename];
        }),
    }),
    createResolver({
      intent: TableAction.OnSchemaAdded,
      resolve: ({ space, schema, show = true }) =>
        Effect.gen(function* () {
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          const { object } = yield* dispatch(
            createIntent(TableAction.Create, { space, typename: Type.getTypename(schema) }),
          );
          yield* dispatch(createIntent(SpaceAction.AddObject, { target: space, object, hidden: true }));

          if (show) {
            return {
              intents: [createIntent(LayoutAction.Open, { part: 'main', subject: [Obj.getDXN(object).toString()] })],
            };
          }
        }),
    }),
    createResolver({
      intent: TableAction.Create,
      resolve: async ({ space, name, typename }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const { view, jsonSchema } = await View.makeFromSpace({ client, space, typename });
        const table = Table.make({ name, view, jsonSchema });
        return { data: { object: table } };
      },
    }),
    createResolver({
      intent: TableAction.AddRow,
      resolve: async ({ view, data }) => {
        const space = getSpace(view);
        invariant(space);
        const typename = view.query ? getTypenameFromQuery(view.query.ast) : undefined;
        invariant(typename);
        const schema = await space.db.schemaRegistry.query({ typename }).firstOrUndefined();
        invariant(schema);
        const object = Obj.make(schema, data);
        return { intents: [createIntent(SpaceAction.AddObject, { target: space, object, hidden: true })] };
      },
    }),
  ]);
