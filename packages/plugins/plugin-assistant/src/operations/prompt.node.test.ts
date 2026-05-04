//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Capabilities } from '@dxos/app-framework';
import { runInSpace } from '@dxos/app-framework/plugin-runtime';
import { AgentPrompt, Chat } from '@dxos/assistant-toolkit';
import { Routine } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { QueueService } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { AutomationPlugin } from '@dxos/plugin-automation/cli';
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Message } from '@dxos/types';

import { AssistantPlugin } from '../cli';

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
      const runtime = await harness.waitForCapability(Capabilities.ProcessManagerRuntime, {
        timeout: 30_000,
      });

      await runtime.runPromise(
        runInSpace(
          personalSpace.id,
          [Database.Service, Feed.FeedService, QueueService] as const,
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
        ),
      );
    },
  );
});
