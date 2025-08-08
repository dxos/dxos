//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';

import { AiService, ConsolePrinter } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import {
  AiConversation,
  GenerationObserver,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
  type ContextBinding,
} from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { DatabaseService, LocalFunctionExecutionService, QueueService } from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { log } from '@dxos/log';
import { Markdown } from '@dxos/plugin-markdown/types';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { readDocument, updateDocument } from '../../functions';
import { testToolkit } from '../testing';

import { TestHelpers } from '@dxos/effect';
import blueprint from './design';

describe('Design Blueprint', { timeout: 120_000 }, () => {
  it.effect(
    'design blueprint',
    Effect.fn(
      function* ({ expect }) {
        const conversation = new AiConversation({
          queue: yield* QueueService.createQueue<DataType.Message | ContextBinding>(),
        });

        const observer = GenerationObserver.fromPrinter(new ConsolePrinter());

        yield* DatabaseService.add(blueprint);
        yield* Effect.promise(() => conversation.context.bind({ blueprints: [Ref.make(blueprint)] }));

        const artifact = yield* DatabaseService.add(Markdown.makeDocument({ content: 'Hello, world!' }));
        let prevContent = artifact.content;

        yield* conversation.run({
          prompt: trim`
            Let's design a new feature for our product. We need to add a user profile system with the following requirements:

            1. Users should be able to create and edit their profiles
            2. Profile should include basic info like name, bio, avatar
            3. Users can control privacy settings for their profile
            4. Profile should show user's activity history
            5. Need to consider data storage and security implications

            What do you think about this approach? Let's capture the key design decisions in our spec.

            The store spec in ${Obj.getDXN(artifact)}
          `,
          observer,
        });
        log.info('spec', { doc: artifact });
        expect(artifact.content).not.toBe(prevContent);
        prevContent = artifact.content;

        yield* conversation.run({
          prompt: trim`
            I want this to be built on top of Durable Objects and SQLite database. Let's adjust the spec to reflect this.
          `,
          observer,
        });
        log.info('spec', { doc: artifact });
        expect(artifact.content).not.toBe(prevContent);
      },
      Effect.provide(
        Layer.mergeAll(
          TestDatabaseLayer({ types: [DataType.Text, Markdown.Document, Blueprint.Blueprint] }),
          makeToolResolverFromFunctions([readDocument, updateDocument], testToolkit),
          makeToolExecutionServiceFromFunctions([readDocument, updateDocument], testToolkit, testToolkit.toLayer({})),
          AiService.model('@anthropic/claude-3-5-sonnet-20241022'),
        ).pipe(
          Layer.provideMerge(AiServiceTestingPreset('direct')),
          Layer.provideMerge(LocalFunctionExecutionService.layer),
        ),
      ),
      TestHelpers.taggedTest('llm'),
    ),
  );
});
