//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import {
  contributes,
  Capabilities,
  createResolver,
  type PluginContext,
  createIntent,
  LayoutAction,
} from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceAction } from '@dxos/plugin-space/types';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { createTable } from '@dxos/react-ui-table';

import { TableAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: TableAction.OnSchemaAdded,
      resolve: ({ space, schema }) =>
        Effect.gen(function* () {
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          const { object } = yield* dispatch(
            createIntent(TableAction.Create, { space, typename: Type.getTypename(schema) }),
          );
          yield* dispatch(createIntent(SpaceAction.AddObject, { target: space, object, hidden: true }));

          return {
            intents: [createIntent(LayoutAction.Open, { part: 'main', subject: [fullyQualifiedId(object)] })],
          };
        }),
    }),
    createResolver({
      intent: TableAction.Create,
      resolve: async ({ space, name, typename }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const { view } = await createTable({ client, space, typename, name });
        return { data: { object: view } };
      },
    }),
    createResolver({
      intent: TableAction.AddRow,
      resolve: async ({ view, data }) => {
        const space = getSpace(view);
        invariant(space);
        invariant(view.query.typename);
        const schema = await space.db.schemaRegistry.query({ typename: view.query.typename }).firstOrUndefined();
        invariant(schema);
        const object = Obj.make(schema, data);
        return { intents: [createIntent(SpaceAction.AddObject, { target: space, object, hidden: true })] };
      },
    }),
  ]);
