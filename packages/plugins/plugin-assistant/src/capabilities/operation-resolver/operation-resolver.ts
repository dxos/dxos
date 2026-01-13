//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { AiContextBinder, AiConversation } from '@dxos/assistant';
import { Agent } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { type Queue } from '@dxos/client/echo';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { TracingService, serializeFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { AutomationCapabilities } from '@dxos/plugin-automation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Collection } from '@dxos/schema';
import { type Message } from '@dxos/types';

import { type AiChatServices, updateName } from '../../processor';
import { Assistant, AssistantCapabilities, AssistantOperation } from '../../types';
import { AssistantBlueprint, createBlueprint } from '../blueprint-definition/blueprint-definition';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const context = yield* Capability.PluginContextService;
    const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);
    const client = yield* Capability.get(ClientCapabilities.Client);
    const runtimeResolver = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
    const mutableState = yield* Capability.get(AssistantCapabilities.MutableState);

    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: AssistantOperation.OnCreateSpace,
        handler: ({ space, rootCollection }) =>
          Effect.gen(function* () {
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
            const { object: chat } = yield* invoke(AssistantOperation.CreateChat, { db: space.db });
            space.db.add(chat);
          }),
      }),
      OperationResolver.make({
        operation: AssistantOperation.CreateChat,
        handler: ({ db, name }) =>
          Effect.gen(function* () {
            const space = client.spaces.get(db.spaceId);
            invariant(space, 'Space not found');
            const queue = space.queues.create();
            const chat = Assistant.make({ name, queue: Ref.fromDXN(queue.dxn) });

            // TODO(wittjosiah): This should be a space-level setting.
            // TODO(burdon): Clone when activated. Copy-on-write for template.
            const blueprints = yield* Effect.promise(async () => db.query(Filter.type(Blueprint.Blueprint)).run());
            let defaultBlueprint = blueprints.find((blueprint) => blueprint.key === AssistantBlueprint.Key);
            if (!defaultBlueprint) {
              defaultBlueprint = db.add(createBlueprint());
            }

            const binder = new AiContextBinder(queue);
            yield* Effect.promise(() =>
              binder.use((b: AiContextBinder) => b.bind({ blueprints: [Ref.make(defaultBlueprint!)] })),
            );

            return { object: chat };
          }),
      }),
      OperationResolver.make({
        operation: AssistantOperation.UpdateChatName,
        handler: ({ chat }) =>
          Effect.gen(function* () {
            const db = Obj.getDatabase(chat);
            const queue = chat.queue.target as Queue<Message.Message>;
            if (!db || !queue) {
              return;
            }

            const runtime = yield* Effect.promise(() =>
              runtimeResolver
                .getRuntime(db.spaceId)
                .runPromise(Effect.runtime<AiChatServices>().pipe(Effect.provide(TracingService.layerNoop))),
            );

            yield* Effect.promise(() =>
              new AiConversation(queue).use(async (conversation) => updateName(runtime, conversation, chat)),
            );
          }),
      }),
      OperationResolver.make({
        operation: AssistantOperation.SetCurrentChat,
        handler: ({ companionTo, chat }) =>
          Effect.sync(() => {
            mutableState.currentChat[Obj.getDXN(companionTo).toString()] = chat && Obj.getDXN(chat).toString();
          }),
      }),
    ]);
  }),
);
