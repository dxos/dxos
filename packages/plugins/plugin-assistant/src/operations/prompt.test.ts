//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { AgentPrompt, Chat } from '@dxos/assistant-toolkit';
import { Routine, Operation } from '@dxos/compute';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { ObjectId } from '@dxos/keys';
import { AutomationCapabilities } from '@dxos/plugin-automation';
import { AutomationPlugin } from '@dxos/plugin-automation/plugin';
import { ClientPlugin } from '@dxos/plugin-client';
import { ClientCapabilities } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Message } from '@dxos/types';

import { AssistantPlugin } from '#plugin';

ObjectId.dangerouslyDisableRandomness();

describe('Agent prompt (composer plugin harness)', () => {
  // Hits AutomationPlugin compute runtime (plugin handlers, AiServiceLayer, blueprints).
  // Requires reachable edge AI (see repo DX_EDGE_AI_SERVICE_URL); not memoized like AssistantTestLayer tests.
  test(
    'chat mode appends assistant messages to the chat queue',
    { tags: ['llm'], timeout: 60_000 },
    async ({ expect }) => {
      await using harness = await createComposerTestApp({
        plugins: [ClientPlugin({}), AssistantPlugin(), AutomationPlugin()],
      });

      const { personalSpace } = await runAndForwardErrors(initializeIdentity(harness.get(ClientCapabilities.Client)));
      const computeProvider = await harness.waitForCapability(AutomationCapabilities.ComputeRuntime, {
        timeout: 30_000,
      });

      await computeProvider.getRuntime(personalSpace.id).runPromise(
        Effect.gen(function* () {
          const feed = yield* Database.add(Feed.make());

          const messageCountBefore = yield* Feed.runQuery(feed, Filter.type(Message.Message)).pipe(
            Effect.map(Array.length),
          );

          const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
          const prompt = yield* Database.add(
            Routine.make({
              name: 'chat-mode-test',
              instructions: 'Reply with a single word: ack.',
              blueprints: [],
              context: [],
            }),
          );
          yield* Database.flush();

          const result = yield* Operation.invoke(AgentPrompt, {
            prompt: Ref.make(prompt),
            input: {},
            chat: Ref.make(chat),
          });

          const messageCountAfter = yield* Feed.runQuery(feed, Filter.type(Message.Message)).pipe(
            Effect.map(Array.length),
          );

          expect(messageCountAfter).toBeGreaterThan(messageCountBefore);
          expect(result).toBe('ack');
        }),
      );
    },
  );
});
