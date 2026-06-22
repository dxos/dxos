//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { AiContext } from '@dxos/assistant';
import { RunInstructions } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Instructions, Template } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { RoutineOperation } from '@dxos/plugin-routine/types';
import { Text } from '@dxos/schema';

import { AssistantCapabilities, AssistantOperation } from '#types';

import { getChatPath } from '../paths';

const handler: Operation.WithHandler<typeof RoutineOperation.RunPromptInNewChat> =
  RoutineOperation.RunPromptInNewChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(
        function* ({ db, prompt: instructions, objects, blueprints, background }) {
          const registry = yield* Capability.get(Capabilities.AtomRegistry);
          const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, { db });

          if ((objects && objects.length > 0) || (blueprints && blueprints.length > 0)) {
            const feedTarget = chat.feed.target;
            invariant(feedTarget, 'Chat feed not found.');
            const client = yield* Capability.get(ClientCapabilities.Client);
            const space = client.spaces.get(db.spaceId);
            invariant(space, 'Space not found.');
            const runtime = yield* Effect.runtime<Database.Service>().pipe(Effect.provide(Database.layer(space.db)));
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
            const instructionsRef =
              typeof instructions === 'string'
                ? Ref.make(
                    Instructions.make({
                      text: instructions,
                      blueprints: [],
                    }),
                  )
                : instructions;
            yield* Database.flush();
            yield* Operation.invoke(
              RunInstructions,
              {
                prompt: instructionsRef,
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
            typeof instructions === 'string'
              ? instructions
              : yield* Effect.gen(function* () {
                  const instructionsObj = yield* Effect.promise(() => instructions.load());
                  const source = yield* Effect.promise(() => instructionsObj.text.load());
                  invariant(Obj.instanceOf(Text.Text, source), 'Prompt text must be Text.');
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
