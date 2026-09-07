//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { RunInstructions } from '@dxos/assistant-toolkit';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EntityId } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Message } from '@dxos/types';

import { AssistantPlugin } from '#plugin';

EntityId.dangerouslyDisableRandomness();

describe('Agent prompt (composer plugin harness)', () => {
  // Hits RoutinePlugin compute runtime (plugin handlers, AiServiceLayer, skills).
  // Requires reachable edge AI (served through the edge /ai proxy); not memoized like AssistantTestLayer tests.
  test(
    'chat mode appends assistant messages to the chat queue',
    { tags: ['manual'], timeout: 60_000 },
    async ({ expect }) => {
      await using harness = await createComposerTestApp({
        plugins: [ClientPlugin.make({}), AssistantPlugin(), RoutinePlugin.make()],
      });

      const { defaultSpace } = await EffectEx.runAndForwardErrors(
        initializeIdentity(harness.get(ClientCapabilities.Client)),
      );

      await harness.runPromise(
        Effect.gen(function* () {
          const feed = yield* Database.add(Feed.make());

          const messageCountBefore = yield* Feed.query(feed, Filter.type(Message.Message)).run.pipe(
            Effect.map(Array.length),
          );

          const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
          const instructions = yield* Database.add(
            Instructions.make({
              name: 'chat-mode-test',
              text: 'Reply with a single word: ack.',
              skills: [],
            }),
          );
          yield* Database.flush();

          const result = yield* Operation.invoke(
            RunInstructions,
            {
              instructions: Ref.make(instructions),
              input: {},
              chat: Ref.make(chat),
            },
            { spaceId: defaultSpace.id },
          );

          const messageCountAfter = yield* Feed.query(feed, Filter.type(Message.Message)).run.pipe(
            Effect.map(Array.length),
          );

          expect(messageCountAfter).toBeGreaterThan(messageCountBefore);
          expect(result).toBe('ack');
        }).pipe(Effect.provide(ServiceResolver.provide({ space: defaultSpace.id }, Database.Service))),
        { timeout: 30_000 },
      );
    },
  );
});
