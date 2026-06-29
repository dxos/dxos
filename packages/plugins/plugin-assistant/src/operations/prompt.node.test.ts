//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Chat, RunInstructions } from '@dxos/assistant-toolkit';
import { Instructions, Operation, ServiceResolver } from '@dxos/compute';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EntityId } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Message } from '@dxos/types';

import { AssistantPlugin } from '#plugin';

EntityId.dangerouslyDisableRandomness();

describe('Agent prompt (composer plugin harness)', () => {
  // Hits RoutinePlugin compute runtime (plugin handlers, AiServiceLayer, skills).
  // Requires reachable edge AI (see repo DX_EDGE_AI_SERVICE_URL); not memoized like AssistantTestLayer tests.
  test(
    'chat mode appends assistant messages to the chat queue',
    { tags: ['llm'], timeout: 60_000 },
    async ({ expect }) => {
      await using harness = await createComposerTestApp({
        plugins: [ClientPlugin({}), AssistantPlugin(), RoutinePlugin()],
      });

      const { personalSpace } = await EffectEx.runAndForwardErrors(
        initializeIdentity(harness.get(ClientCapabilities.Client)),
      );

      await harness.runPromise(
        Effect.gen(function* () {
          const feed = yield* Database.add(Feed.make());

          const messageCountBefore = yield* Feed.runQuery(feed, Filter.type(Message.Message)).pipe(
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
            { spaceId: personalSpace.id },
          );

          const messageCountAfter = yield* Feed.runQuery(feed, Filter.type(Message.Message)).pipe(
            Effect.map(Array.length),
          );

          expect(messageCountAfter).toBeGreaterThan(messageCountBefore);
          expect(result).toBe('ack');
        }).pipe(Effect.provide(ServiceResolver.provide({ space: personalSpace.id }, Database.Service))),
        { timeout: 30_000 },
      );
    },
  );
});
