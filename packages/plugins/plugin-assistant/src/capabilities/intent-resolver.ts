//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { Capabilities, contributes, createIntent, createResolver, type PluginContext } from '@dxos/app-framework';
import { Sequence } from '@dxos/conductor';
import { Key, Obj, Ref, Type } from '@dxos/echo';
import { CollectionAction } from '@dxos/plugin-space/types';

import { AssistantAction, AIChatType } from '../types';

export default (context: PluginContext) => [
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: AssistantAction.OnSpaceCreated,
      resolve: ({ space, rootCollection }) =>
        Effect.gen(function* () {
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          const { object: collection } = yield* dispatch(
            createIntent(CollectionAction.CreateQueryCollection, { typename: Type.getTypename(AIChatType) }),
          );
          rootCollection.objects.push(Ref.make(collection));

          const { object: chat } = yield* dispatch(createIntent(AssistantAction.CreateChat, { space }));
          space.db.add(chat);
        }),
    }),
    createResolver({
      intent: AssistantAction.CreateChat,
      resolve: ({ space, name }) => ({
        data: {
          object: Obj.make(AIChatType, {
            name,
            queue: Ref.fromDXN(space.queues.create().dxn),
          }),
        },
      }),
    }),
    createResolver({
      intent: AssistantAction.CreateSequence,
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
