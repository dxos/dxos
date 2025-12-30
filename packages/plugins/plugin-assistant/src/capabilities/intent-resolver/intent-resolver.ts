//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, createIntent, createResolver } from '@dxos/app-framework';
import { AiContextBinder, AiConversation } from '@dxos/assistant';
import { Agent } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt, Template } from '@dxos/blueprints';
import { type Queue } from '@dxos/client/echo';
import { Sequence } from '@dxos/conductor';
import { Filter, Key, Obj, Ref, Type } from '@dxos/echo';
import { TracingService, serializeFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { AutomationCapabilities } from '@dxos/plugin-automation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Collection } from '@dxos/schema';
import { type Message } from '@dxos/types';

import { type AiChatServices, updateName } from '../../processor';
import { Assistant, AssistantAction, AssistantCapabilities } from '../../types';
import { AssistantBlueprint, createBlueprint } from '../blueprint-definition/blueprint-definition';

export default Capability.makeModule((context) =>
  Effect.succeed([
    Capability.contributes(Common.Capability.IntentResolver, [
      createResolver({
        intent: AssistantAction.OnCreateSpace,
        resolve: ({ space, rootCollection }) =>
          Effect.gen(function* () {
            const { dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
            const chatCollection = Collection.makeManaged({ key: Assistant.Chat.typename });
            const blueprintCollection = Collection.makeManaged({ key: Blueprint.Blueprint.typename });
            const promptCollection = Collection.makeManaged({ key: Type.getTypename(Prompt.Prompt) });
            rootCollection.objects.push(
              Ref.make(chatCollection),
              Ref.make(blueprintCollection),
              Ref.make(promptCollection),
            );

            // TODO(wittjosiah): Remove once function registry is avaiable.
            space.db.add(serializeFunction(Agent.prompt));

            // Create default chat.
            const { object: chat } = yield* dispatch(createIntent(AssistantAction.CreateChat, { db: space.db }));
            space.db.add(chat);
          }),
      }),
      createResolver({
        intent: AssistantAction.CreateChat,
        resolve: async ({ db, name }) => {
          const client = context.getCapability(ClientCapabilities.Client);
          const space = client.spaces.get(db.spaceId);
          invariant(space, 'Space not found');
          const queue = space.queues.create();
          const chat = Assistant.make({ name, queue: Ref.fromDXN(queue.dxn) });

          // TODO(wittjosiah): This should be a space-level setting.
          // TODO(burdon): Clone when activated. Copy-on-write for template.
          const blueprints = await db.query(Filter.type(Blueprint.Blueprint)).run();
          let defaultBlueprint = blueprints.find((blueprint) => blueprint.key === AssistantBlueprint.Key);
          if (!defaultBlueprint) {
            defaultBlueprint = db.add(createBlueprint());
          }

          const binder = new AiContextBinder(queue);
          await binder.use((binder) => binder.bind({ blueprints: [Ref.make(defaultBlueprint)] }));

          return {
            data: { object: chat },
          };
        },
      }),
      createResolver({
        intent: AssistantAction.UpdateChatName,
        resolve: async ({ chat }) => {
          const db = Obj.getDatabase(chat);
          const queue = chat.queue.target as Queue<Message.Message>;
          if (!db || !queue) {
            return;
          }

          const runtimeResolver = context.getCapability(AutomationCapabilities.ComputeRuntime);
          const runtime = await runtimeResolver
            .getRuntime(db.spaceId)
            .runPromise(Effect.runtime<AiChatServices>().pipe(Effect.provide(TracingService.layerNoop)));

          await new AiConversation(queue).use(async (conversation) => updateName(runtime, conversation, chat));
        },
      }),
      createResolver({
        intent: AssistantAction.CreateBlueprint,
        resolve: ({ key, name, description }) => ({
          data: {
            object: Blueprint.make({
              key,
              name,
              description,
              instructions: Template.make(),
            }),
          },
        }),
      }),
      createResolver({
        intent: AssistantAction.CreatePrompt,
        resolve: ({ name }) => ({
          data: {
            object: Prompt.make({ name }),
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
            state.currentChat[Obj.getDXN(companionTo).toString()] = chat && Obj.getDXN(chat).toString();
          }),
      }),
    ]),
  ]),
);
