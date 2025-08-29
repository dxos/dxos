//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { Capabilities, type PluginContext, contributes, createIntent, createResolver } from '@dxos/app-framework';
import { AiContextBinder } from '@dxos/assistant';
import { Blueprint, Template } from '@dxos/blueprints';
import { fullyQualifiedId } from '@dxos/client/echo';
import { Sequence } from '@dxos/conductor';
import { Filter, Key, Obj, Ref } from '@dxos/echo';
import { CollectionAction } from '@dxos/plugin-space/types';

import { Assistant, AssistantAction } from '../types';

import { BLUEPRINT, BLUEPRINT_KEY } from './blueprint-definition';
import { AssistantCapabilities } from './capabilities';

export default (context: PluginContext) => [
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: AssistantAction.OnSpaceCreated,
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
          const { object: chat } = yield* dispatch(createIntent(AssistantAction.CreateChat, { space }));
          space.db.add(chat);
          space.db.add(BLUEPRINT);
        }),
    }),
    createResolver({
      intent: AssistantAction.CreateChat,
      resolve: async ({ space, name }) => {
        const queue = space.queues.create();
        const object = Obj.make(Assistant.Chat, {
          name,
          queue: Ref.fromDXN(queue.dxn),
        });

        const { objects: blueprints } = await space.db.query(Filter.type(Blueprint.Blueprint)).run();
        // TODO(wittjosiah): This should be a space-level setting.
        const defaultBlueprint = blueprints.find((blueprint) => blueprint.key === BLUEPRINT_KEY);
        if (defaultBlueprint) {
          const binder = new AiContextBinder(queue);
          await binder.bind({ blueprints: [Ref.make(defaultBlueprint)] });
        }

        return { data: { object } };
      },
    }),
    createResolver({
      intent: AssistantAction.CreateBlueprint,
      resolve: ({ key, name, description }) => ({
        data: {
          object: Blueprint.make({ key, name, description, instructions: Template.make({ source: '' }) }),
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
    createResolver({
      intent: AssistantAction.SetCurrentChat,
      resolve: ({ companionTo, chat }) =>
        Effect.gen(function* () {
          const state = context.getCapability(AssistantCapabilities.MutableState);
          state.currentChat[fullyQualifiedId(companionTo)] = chat;
        }),
    }),
  ]),
];
