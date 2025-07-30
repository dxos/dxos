//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { Capabilities, contributes, createIntent, createResolver, type PluginContext } from '@dxos/app-framework';
import { Blueprint } from '@dxos/blueprints';
import { Sequence } from '@dxos/conductor';
import { Key, Obj, Ref } from '@dxos/echo';
import { CollectionAction } from '@dxos/plugin-space/types';

import { Assistant } from '../types';

export default (context: PluginContext) => [
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: Assistant.OnSpaceCreated,
      resolve: ({ space, rootCollection }) =>
        Effect.gen(function* () {
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          const { object: chatCollection } = yield* dispatch(
            createIntent(CollectionAction.CreateQueryCollection, { typename: Assistant.Chat.typename }),
          );
          const { object: blueprintCollection } = yield* dispatch(
            createIntent(CollectionAction.CreateQueryCollection, { typename: Blueprint.Blueprint.typename }),
          );
          rootCollection.objects.push(Ref.make(chatCollection), Ref.make(blueprintCollection));

          const { object: chat } = yield* dispatch(createIntent(Assistant.CreateChat, { space }));
          space.db.add(chat);

          // TODO(wittjosiah): Create default blueprint.
          // const { object: blueprint } = yield* dispatch(createIntent(Assistant.CreateBlueprint, { ... }));
          // space.db.add(blueprint);
        }),
    }),
    createResolver({
      intent: Assistant.CreateChat,
      resolve: ({ space, name }) => ({
        data: {
          object: Obj.make(Assistant.Chat, {
            name,
            queue: Ref.fromDXN(space.queues.create().dxn),
          }),
        },
      }),
    }),
    createResolver({
      intent: Assistant.CreateBlueprint,
      resolve: ({ name, description }) => ({
        data: { object: Blueprint.make({ name, description }) },
      }),
    }),
    createResolver({
      intent: Assistant.CreateSequence,
      resolve: ({ name }) => ({
        data: {
          object: Obj.make(Sequence, {
            name,
            steps: [
              {
                id: Key.ObjectId.random(),
                instructions: 'You are a helpful assistant.',
              },
            ],
          }),
        },
      }),
    }),
  ]),
];
