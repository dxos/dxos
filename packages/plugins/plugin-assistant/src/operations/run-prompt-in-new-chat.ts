//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { AiContext } from '@dxos/assistant';
import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Routine, Template } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Text } from '@dxos/schema';

import { AssistantCapabilities, AssistantOperation } from '#types';

import { getChatPath } from '../paths';

const handler: Operation.WithHandler<typeof AssistantOperation.RunPromptInNewChat> =
  AssistantOperation.RunPromptInNewChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(
        function* ({ db, prompt, objects, blueprints, background }) {
          const registry = yield* Capability.get(Capabilities.AtomRegistry);
          const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, { db });

          if ((objects && objects.length > 0) || (blueprints && blueprints.length > 0)) {
            const feedTarget = chat.feed.target;
            invariant(feedTarget, 'Chat feed not found.');
            const client = yield* Capability.get(ClientCapabilities.Client);
            const space = client.spaces.get(db.spaceId);
            invariant(space, 'Space not found.');
            const feedServiceLayer = createFeedServiceLayer(space.db);
            const runtime = yield* Effect.runtime<Feed.FeedService>().pipe(Effect.provide(feedServiceLayer));
            const binder = new AiContext.Binder({ feed: feedTarget, runtime, registry });
            yield* Effect.promise(() =>
              binder.use(async (b: AiContext.Binder) => {
                const bindingProps: Parameters<AiContext.Binder['bind']>[0] = {};

                if (objects && objects.length > 0) {
                  bindingProps.objects = objects.map((obj) => Ref.make(obj));
                }

                if (blueprints && blueprints.length > 0) {
                  const allBlueprints = await db.query(Filter.type(Blueprint.Blueprint)).run();
                  const matchedBlueprints = allBlueprints.filter((blueprint) => {
                    const blueprintKey = Obj.getMeta(blueprint).key;
                    return blueprintKey !== undefined && blueprints.includes(blueprintKey);
                  });
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
                    Routine.make({
                      instructions: prompt,
                      blueprints: [],
                      context: [],
                    }),
                  )
                : prompt;
            yield* Database.flush();
            yield* Operation.invoke(
              AgentPrompt,
              {
                prompt: promptRef,
                input: {},
                chat: Ref.make(chat),
              },
              { spaceId: db.spaceId },
            ).pipe(
              Effect.catchAll((error) => {
                log.catch(error);
                return Effect.void;
              }),
            );
            return { object: chat };
          }

          const chatPath = getChatPath(db.spaceId, chat.id);
          const pendingPromptText =
            typeof prompt === 'string'
              ? prompt
              : yield* Effect.gen(function* () {
                  const promptObj = yield* Effect.promise(() => prompt.load());
                  const source = yield* Effect.promise(() => promptObj.instructions.load());
                  invariant(Obj.instanceOf(Text.Text, source), 'Prompt instructions must be Text.');
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
