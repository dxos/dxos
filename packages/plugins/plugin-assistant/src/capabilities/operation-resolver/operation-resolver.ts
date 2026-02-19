//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AiContextBinder, AiConversation } from '@dxos/assistant';
import { AgentFunctions, Chat } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { type Queue } from '@dxos/client/echo';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { TracingService, serializeFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { Operation, OperationResolver } from '@dxos/operation';
import { AutomationCapabilities } from '@dxos/plugin-automation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Collection } from '@dxos/schema';
import { type Message } from '@dxos/types';

import { AssistantBlueprint } from '../../blueprints';
import { type AiChatServices, updateName } from '../../processor';
import { AssistantCapabilities, AssistantOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: AssistantOperation.OnCreateSpace,
        handler: Effect.fnUntraced(function* ({ space, rootCollection }) {
          const chatCollection = Collection.makeManaged({ key: Chat.Chat.typename });
          const blueprintCollection = Collection.makeManaged({ key: Blueprint.Blueprint.typename });
          const promptCollection = Collection.makeManaged({ key: Type.getTypename(Prompt.Prompt) });
          Obj.change(rootCollection, (c) => {
            c.objects.push(Ref.make(chatCollection), Ref.make(blueprintCollection), Ref.make(promptCollection));
          });

          // TODO(wittjosiah): Remove once function registry is avaiable.
          space.db.add(serializeFunction(AgentFunctions.Prompt));

          // Create default chat.
          const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, { db: space.db });
          space.db.add(chat);
        }),
      }),
      OperationResolver.make({
        operation: AssistantOperation.CreateChat,
        handler: Effect.fnUntraced(function* ({ db, name, addToSpace = true }) {
          const registry = yield* Capability.get(Capabilities.AtomRegistry);
          const client = yield* Capability.get(ClientCapabilities.Client);
          const space = client.spaces.get(db.spaceId);
          invariant(space, 'Space not found');
          const queue = space.queues.create();
          const chat = Chat.make({ name, queue: Ref.fromDXN(queue.dxn) });
          if (addToSpace) {
            space.db.add(chat);
          }

          // TODO(wittjosiah): This should be a space-level setting.
          // TODO(burdon): Clone when activated. Copy-on-write for template.
          const blueprints = yield* Effect.promise(() => db.query(Filter.type(Blueprint.Blueprint)).run());
          let defaultBlueprint = blueprints.find((blueprint) => blueprint.key === AssistantBlueprint.key);
          if (!defaultBlueprint) {
            defaultBlueprint = db.add(AssistantBlueprint.make());
          }

          const binder = new AiContextBinder({ queue, registry });
          yield* Effect.promise(() =>
            binder.use((b: AiContextBinder) => b.bind({ blueprints: [Ref.make(defaultBlueprint!)] })),
          );

          return { object: chat };
        }),
      }),
      OperationResolver.make({
        operation: AssistantOperation.UpdateChatName,
        handler: Effect.fnUntraced(function* ({ chat }) {
          const registry = yield* Capability.get(Capabilities.AtomRegistry);
          const db = Obj.getDatabase(chat);
          const queue = chat.queue.target as Queue<Message.Message>;
          if (!db || !queue) {
            return;
          }

          const runtimeResolver = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
          const runtime = yield* Effect.promise(() =>
            runtimeResolver
              .getRuntime(db.spaceId)
              .runPromise(Effect.runtime<AiChatServices>().pipe(Effect.provide(TracingService.layerNoop))),
          );

          yield* Effect.promise(() =>
            new AiConversation({ queue, registry }).use(async (conversation) =>
              updateName(runtime, conversation, chat),
            ),
          );
        }),
      }),
      OperationResolver.make({
        operation: AssistantOperation.SetCurrentChat,
        handler: Effect.fnUntraced(function* ({ companionTo, chat }) {
          const companionToId = Obj.getDXN(companionTo).toString();
          const chatId = chat && Obj.getDXN(chat).toString();
          yield* Capabilities.updateAtomValue(AssistantCapabilities.State, (current) => ({
            ...current,
            currentChat: { ...current.currentChat, [companionToId]: chatId },
          }));
        }),
      }),
    ]);
  }),
);
