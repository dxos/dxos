//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { getObjectPathFromObject, LayoutOperation } from '@dxos/app-toolkit';
import { AiContextBinder } from '@dxos/assistant';
import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt, Template } from '@dxos/blueprints';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { invokeFunctionWithTracing } from '@dxos/plugin-automation/hooks';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { Text } from '@dxos/schema';

import { AssistantCapabilities } from '../types';
import { CreateChat, RunPromptInNewChat } from './definitions';

const handler: Operation.WithHandler<typeof RunPromptInNewChat> = RunPromptInNewChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ db, prompt, objects, blueprints, background }) {
        const registry = yield* Capability.get(Capabilities.AtomRegistry);
        const { object: chat } = yield* Operation.invoke(CreateChat, { db });

        if ((objects && objects.length > 0) || (blueprints && blueprints.length > 0)) {
          const feedTarget = chat.feed.target;
          invariant(feedTarget, 'Chat feed not found.');
          const queueDxn = Feed.getQueueDxn(feedTarget);
          invariant(queueDxn, 'Feed queue DXN not found.');
          const client = yield* Capability.get(ClientCapabilities.Client);
          const space = client.spaces.get(db.spaceId);
          invariant(space, 'Space not found.');
          const queue = space.queues.get(queueDxn);
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
  ),
);

export default handler;
