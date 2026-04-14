//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService, ConsolePrinter } from '@dxos/ai';
import { GenericToolkit } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { AiConversation, GenerationObserver, ToolExecutionServices } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { Database, Feed } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { Trace, TracingService } from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { Operation, OperationHandlerSet, OperationRegistry } from '@dxos/operation';
import { log } from '@dxos/log';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { MarkdownHandlers } from '../markdown';
import DesignBlueprint from './blueprint';

describe('Design Blueprint', { timeout: 120_000 }, () => {
  it.scoped(
    'design blueprint',
    Effect.fn(
      function* ({ expect }) {
        const observer = GenerationObserver.fromPrinter(new ConsolePrinter());
        const feed = Feed.make();
        yield* Database.add(feed);
        const runtime = yield* Effect.runtime<Feed.FeedService>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation({ feed, runtime }));

        const blueprint = DesignBlueprint.make();
        yield* Database.add(blueprint);
        yield* Effect.promise(() =>
          conversation.context.bind({
            blueprints: [Ref.make(blueprint)],
          }),
        );

        const artifact = yield* Database.add(Markdown.make({ content: 'Hello, world!' }));
        let prevContent = artifact.content;

        {
          const prompt = trim`
            I want to design a new feature for our product.

            We need to add a user profile system with the following requirements:
            1. Users should be able to create and edit their profiles
            2. Profile should include basic info like name, bio, avatar
            3. Users can control privacy settings for their profile
            4. Profile should show user's activity history
            5. Need to consider data storage and security implications

            Let's capture the key design decisions in our spec in ${Obj.getDXN(artifact)}
          `;

          yield* conversation.createRequest({ prompt, observer });
          log.info('spec', { doc: artifact });
          expect(artifact.content).not.toBe(prevContent);
          prevContent = artifact.content;
        }

        {
          const prompt = trim`
            I want this to be built on top of Durable Objects and SQLite database.
            Adjust the spec to reflect this.
          `;

          yield* conversation.createRequest({ observer, prompt });
          expect(artifact.content).not.toBe(prevContent);
          prevContent = artifact.content;
        }
      },
      Effect.provide(
        Layer.mergeAll(ToolExecutionServices, AiService.model('@anthropic/claude-3-5-sonnet-20241022')).pipe(
          Layer.provideMerge(
            Layer.effect(
              Operation.Service,
              Effect.gen(function* () {
                const resolved = yield* MarkdownHandlers.handlers;
                return {
                  invoke: (op: any, ...args: any[]) => {
                    const handler = resolved.find((h: any) => h.meta.key === op.meta.key);
                    if (!handler) {
                      return Effect.die(`No handler found: ${op.meta.key}`);
                    }
                    const result = handler.handler(args[0]);
                    return Effect.isEffect(result) ? (result as Effect.Effect<unknown>) : Effect.succeed(result);
                  },
                  schedule: () => Effect.void,
                  invokePromise: async () => ({ error: new Error('Not implemented') }),
                } as Operation.OperationService;
              }),
            ),
          ),
          Layer.provideMerge(OperationRegistry.layer),
          Layer.provideMerge(
            Layer.mergeAll(
              GenericToolkit.providerEmpty,
              AiServiceTestingPreset('direct'),
              TestDatabaseLayer({ types: [Text.Text, Markdown.Document, Blueprint.Blueprint] }),
              OperationHandlerSet.provide(MarkdownHandlers),
              TracingService.layerNoop,
              Trace.writerLayerNoop,
            ),
          ),
        ),
      ),
      TestHelpers.provideTestContext,
      TestHelpers.taggedTest('llm'),
    ),
  );
});
