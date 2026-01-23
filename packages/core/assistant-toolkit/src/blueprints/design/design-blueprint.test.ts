//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService, ConsolePrinter } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import {
  AiConversation,
  type ContextBinding,
  GenerationObserver,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { QueueService, TracingService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTestMocked, TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { log } from '@dxos/log';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Text } from '@dxos/schema';
import { type Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { Document } from '../../functions';
import { testToolkit } from '../testing';

import { blueprint } from './design-blueprint';

describe('Design Blueprint', { timeout: 120_000 }, () => {
  it.scoped(
    'design blueprint',
    Effect.fn(
      function* ({ expect }) {
        const observer = GenerationObserver.fromPrinter(new ConsolePrinter());
        const queue = yield* QueueService.createQueue<Message.Message | ContextBinding>();
        const conversation = yield* acquireReleaseResource(() => new AiConversation(queue));

        yield* Database.Service.add(blueprint);
        yield* Effect.promise(() =>
          conversation.context.bind({
            blueprints: [Ref.make(blueprint)],
          }),
        );

        const artifact = yield* Database.Service.add(Markdown.make({ content: 'Hello, world!' }));
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
        Layer.mergeAll(
          makeToolResolverFromFunctions([Document.read, Document.update], testToolkit),
          makeToolExecutionServiceFromFunctions(testToolkit, testToolkit.toLayer({}) as any),
          AiService.model('@anthropic/claude-3-5-sonnet-20241022'),
        ).pipe(
          Layer.provideMerge(TestDatabaseLayer({ types: [Text.Text, Markdown.Document, Blueprint.Blueprint] })),
          Layer.provideMerge(AiServiceTestingPreset('direct')),
          Layer.provideMerge(
            FunctionInvocationServiceLayerTestMocked({ functions: [Document.read, Document.update] }).pipe(
              Layer.provideMerge(TracingService.layerNoop),
            ),
          ),
        ),
      ),
      TestHelpers.provideTestContext,
      TestHelpers.taggedTest('llm'),
    ),
  );
});
