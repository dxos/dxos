//
// Copyright 2026 DXOS.org
//

import { Array } from 'effect';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { ContextBinding } from '@dxos/assistant';
import { AgentPrompt, Chat } from '@dxos/assistant-toolkit';
import { Prompt } from '@dxos/blueprints';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { runAndForwardErrors } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { QueueService } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { Operation } from '@dxos/operation';
import { AutomationPlugin } from '@dxos/plugin-automation/cli';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
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
  test.runIf(TestHelpers.tagEnabled('llm'))(
    'chat mode appends assistant messages to the chat queue',
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
            Prompt.make({
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
    60_000,
  );
});
