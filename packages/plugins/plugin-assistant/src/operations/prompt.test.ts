//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { ContextBinding } from '@dxos/assistant';
import { AgentPrompt, Chat } from '@dxos/assistant-toolkit';
import { Prompt } from '@dxos/blueprints';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
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

      const client = harness.get(ClientCapabilities.Client);
      const { personalSpace } = await runAndForwardErrors(initializeIdentity(client));

      const echoBindings = Layer.mergeAll(
        Database.layer(personalSpace.db),
        QueueService.layer(personalSpace.queues),
        createFeedServiceLayer(personalSpace.queues),
      );

      const computeProvider = await harness.waitForCapability(AutomationCapabilities.ComputeRuntime, {
        timeout: 30_000,
      });
      const spaceRuntime = computeProvider.getRuntime(personalSpace.id);

      const setupProgram = Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make());
        const queueDxn = Feed.getQueueDxn(feed)!;
        const queue = yield* QueueService.getQueue<Message.Message | ContextBinding>(queueDxn);

        const countMessages = () =>
          Effect.promise(async () => {
            const items = await queue.queryObjects();
            return items.filter(Obj.instanceOf(Message.Message)).length;
          });

        const messageCountBefore = yield* countMessages();

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

        return { prompt, chat, messageCountBefore, queueDxn };
      });

      const { prompt, chat, messageCountBefore, queueDxn } = await runAndForwardErrors(
        setupProgram.pipe(Effect.provide(echoBindings)),
      );

      const result = await spaceRuntime.runPromise(
        Operation.invoke(AgentPrompt, {
          prompt: Ref.make(prompt),
          input: {},
          chat: Ref.make(chat),
        }),
      );

      const countAfterProgram = Effect.gen(function* () {
        const queue = yield* QueueService.getQueue<Message.Message | ContextBinding>(queueDxn);
        const items = yield* Effect.promise(() => queue.queryObjects());
        return items.filter(Obj.instanceOf(Message.Message)).length;
      });

      const messageCountAfter = await runAndForwardErrors(countAfterProgram.pipe(Effect.provide(echoBindings)));

      expect(messageCountAfter).toBeGreaterThan(messageCountBefore);
      expect(result).toBe('ack');
    },
    60_000,
  );
});
