//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { getObjectPathFromObject, LayoutOperation } from '@dxos/app-toolkit';
import { AiContextBinder, AiConversation } from '@dxos/assistant';
import {
  AgentPrompt,
  BlueprintManagerBlueprint,
  Chat,
  DatabaseBlueprint,
  ProjectWizardBlueprint,
} from '@dxos/assistant-toolkit';
import { Blueprint, Prompt, Template } from '@dxos/blueprints';
import { type Queue } from '@dxos/client/echo';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { TracingService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation, OperationResolver } from '@dxos/operation';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Text } from '@dxos/schema';
import { type Message } from '@dxos/types';

import { AssistantBlueprint } from '../../blueprints';
import { type AiChatServices, updateName } from '../../processor';
import { AssistantCapabilities, AssistantOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: AssistantOperation.OnCreateSpace,
        handler: Effect.fnUntraced(function* ({ space }) {
          // TODO(wittjosiah): Remove once function registry is avaiable.
          space.db.add(Operation.serialize(AgentPrompt));

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
          const chat = Chat.make({ name, queue: db.makeRef<any>(queue.dxn) });
          if (addToSpace) {
            space.db.add(chat);
          }

          // TODO(wittjosiah): This should be a space-level setting.
          // TODO(burdon): Clone when activated. Copy-on-write for template.
          const blueprints = yield* Effect.promise(() => db.query(Filter.type(Blueprint.Blueprint)).run());
          let defaultAssistantBlueprint = blueprints.find((blueprint) => blueprint.key === AssistantBlueprint.key);
          if (!defaultAssistantBlueprint) {
            defaultAssistantBlueprint = db.add(AssistantBlueprint.make());
          }
          let defaultDatabaseBlueprint = blueprints.find((blueprint) => blueprint.key === DatabaseBlueprint.key);
          if (!defaultDatabaseBlueprint) {
            defaultDatabaseBlueprint = db.add(DatabaseBlueprint.make());
          }
          let defaultProjectWizardBlueprint = blueprints.find(
            (blueprint) => blueprint.key === ProjectWizardBlueprint.key,
          );
          if (!defaultProjectWizardBlueprint) {
            defaultProjectWizardBlueprint = db.add(ProjectWizardBlueprint.make());
          }
          let defaultBlueprintManagerBlueprint = blueprints.find(
            (blueprint) => blueprint.key === BlueprintManagerBlueprint.key,
          );
          if (!defaultBlueprintManagerBlueprint) {
            defaultBlueprintManagerBlueprint = db.add(BlueprintManagerBlueprint.make());
          }

          const binder = new AiContextBinder({ queue, registry });
          yield* Effect.promise(() =>
            binder.use((b: AiContextBinder) =>
              b.bind({
                blueprints: [
                  Ref.make(defaultAssistantBlueprint!),
                  Ref.make(defaultDatabaseBlueprint!),
                  Ref.make(defaultProjectWizardBlueprint!),
                  Ref.make(defaultBlueprintManagerBlueprint!),
                ],
              }),
            ),
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
      OperationResolver.make({
        operation: AssistantOperation.RunPromptInNewChat,
        handler: Effect.fnUntraced(
          function* ({ db, prompt, objects, blueprints, background }) {
            const registry = yield* Capability.get(Capabilities.AtomRegistry);
            const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, { db });

            if ((objects && objects.length > 0) || (blueprints && blueprints.length > 0)) {
              const queue = chat.queue.target as Queue<Message.Message>;
              const binder = new AiContextBinder({ queue, registry });
              yield* Effect.promise(() =>
                binder.use(async (b: AiContextBinder) => {
                  const bindingProps: Parameters<AiContextBinder['bind']>[0] = {};

                  if (objects && objects.length > 0) {
                    bindingProps.objects = objects.map((obj) => Ref.make(obj));
                  }

                  if (blueprints && blueprints.length > 0) {
                    const allBlueprints = await db.query(Filter.type(Blueprint.Blueprint)).run();
                    const matchedBlueprints = allBlueprints.filter(
                      (blueprint) => blueprint.key && blueprints.includes(blueprint.key),
                    );
                    if (matchedBlueprints.length > 0) {
                      bindingProps.blueprints = matchedBlueprints.map((blueprint) => Ref.make(blueprint));
                    }
                  }

                  await b.bind(bindingProps);
                }),
              );
            }

            if (background) {
              const promptRef =
                typeof prompt === 'string'
                  ? Ref.make(
                      Prompt.make({
                        instructions: prompt,
                        blueprints: [],
                        context: [],
                      }),
                    )
                  : prompt;
              yield* Database.flush();
              const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
              const runtime = yield* computeRuntime.getRuntime(db.spaceId).runtimeEffect;
              yield* invokeFunctionWithTracing(AgentPrompt, {
                prompt: promptRef,
                input: {},
                chat: Ref.make(chat),
              }).pipe(
                Effect.provide(runtime),
                Effect.catchAll((error) => {
                  log.catch(error);
                  return Effect.void;
                }),
              );
              return { object: chat };
            }

            const chatPath = getObjectPathFromObject(chat);
            const pendingPromptText =
              typeof prompt === 'string'
                ? prompt
                : yield* Effect.gen(function* () {
                    const promptObj = yield* Effect.promise(() => prompt.load());
                    const source = yield* Effect.promise(() => promptObj.instructions.source.load());
                    invariant(Obj.instanceOf(Text.Text, source), 'Prompt template source must be Text.');
                    return Template.process(source.content ?? '');
                  });
            yield* Capabilities.updateAtomValue(AssistantCapabilities.State, (current) => ({
              ...current,
              pendingPrompts: { ...current.pendingPrompts, [chatPath]: pendingPromptText },
            }));
            yield* Operation.invoke(LayoutOperation.Open, { subject: [chatPath] });
            return { object: chat };
          },
          (effect, { db }) => effect.pipe(Effect.provide(Database.layer(db))),
        ),
      }),
    ]);
  }),
);
