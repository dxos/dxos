//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';

import { AiService, ConsolePrinter } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import {
  AiConversation,
  AiSession,
  type ContextBinding,
  GenerationObserver,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import { DatabaseService, LocalFunctionExecutionService, QueueService, TracingService } from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { log } from '@dxos/log';
import { Markdown } from '@dxos/plugin-markdown/types';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { readDocument, updateDocument } from '../../functions';
import { testToolkit } from '../testing';

import blueprint from './design';

describe('Design Blueprint', { timeout: 120_000 }, () => {
  it.effect(
    'design blueprint',
    Effect.fn(
      function* ({ expect }) {
        const observer = GenerationObserver.fromPrinter(new ConsolePrinter());
        const conversation = new AiConversation({
          queue: yield* QueueService.createQueue<DataType.Message | ContextBinding>(),
        });

        yield* DatabaseService.add(blueprint);
        yield* Effect.promise(() =>
          conversation.context.bind({
            blueprints: [Ref.make(blueprint)],
          }),
        );

        const artifact = yield* DatabaseService.add(Markdown.makeDocument({ content: 'Hello, world!' }));
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

          const session = new AiSession();
          yield* conversation.exec({ prompt, observer, session });
          log.info('spec', { doc: artifact });
          expect(artifact.content).not.toBe(prevContent);
          prevContent = artifact.content;
        }

        {
          const prompt = trim`
            I want this to be built on top of Durable Objects and SQLite database. 
            Adjust the spec to reflect this.
          `;

          const session = new AiSession();
          yield* conversation.exec({ prompt, observer, session });
          log.info('spec', { doc: artifact });
          expect(artifact.content).not.toBe(prevContent);
          prevContent = artifact.content;
        }
      },
      Effect.provide(
        Layer.mergeAll(
          TestDatabaseLayer({ types: [DataType.Text, Markdown.Document, Blueprint.Blueprint] }),
          makeToolResolverFromFunctions([readDocument, updateDocument], testToolkit),
          makeToolExecutionServiceFromFunctions(
            [readDocument, updateDocument],
            testToolkit,
            testToolkit.toLayer({}) as any,
          ),
          AiService.model('@anthropic/claude-3-5-sonnet-20241022'),
        ).pipe(
          Layer.provideMerge(AiServiceTestingPreset('direct')),
          Layer.provideMerge(LocalFunctionExecutionService.layer),
          Layer.provideMerge(TracingService.layerNoop),
        ),
      ),
      TestHelpers.taggedTest('llm'),
    ),
  );
});
