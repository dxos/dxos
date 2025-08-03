//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import { Effect, Layer, Option, Stream } from 'effect';

import { AiService, ConsolePrinter } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import {
  AiSession,
  Conversation,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { DatabaseService, LocalFunctionExecutionService, QueueService } from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { log } from '@dxos/log';
import { Markdown } from '@dxos/plugin-markdown/types';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import blueprint from './design';
import { readDocument, updateDocument } from '../../functions';

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('Design Blueprint', { timeout: 120_000 }, () => {
  it.effect(
    'design blueprint',
    Effect.fn(
      function* () {
        const { queues } = yield* QueueService;
        const { db } = yield* DatabaseService;

        const conversation = new Conversation({
          queue: queues.create(),
        });

        const session = new AiSession();
        const printer = new ConsolePrinter();
        const messageQueue = session.messageQueue.pipe(
          Stream.fromQueue,
          Stream.runForEach((message) => Effect.sync(() => printer.printMessage(message))),
        );
        const blockQueue = session.blockQueue.pipe(
          Stream.fromQueue,
          Stream.runForEach((block) =>
            Effect.sync(() =>
              Option.match(block, {
                onSome: (block) => printer.printContentBlock(block),
                onNone: () => Effect.void,
              }),
            ),
          ),
        );

        db.add(blueprint);
        yield* Effect.promise(() => conversation.context.bind({ blueprints: [Ref.make(blueprint)] }));

        const artifact = db.add(Markdown.makeDocument({ content: 'Hello, world!' }));
        let prevContent = artifact.content;

        const run = conversation.run({
          session,
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
        });
        yield* Effect.all([run, messageQueue, blockQueue]);
        log.info('spec', { doc: artifact });
        expect(artifact.content).not.toBe(prevContent);
        prevContent = artifact.content;

        yield* conversation.run({
          prompt: trim`
            I want this to be built on top of Durable Objects and SQLite database. Let's adjust the spec to reflect this.
          `,
        });
        log.info('spec', { doc: artifact });
        expect(artifact.content).not.toBe(prevContent);
      },
      Effect.provide(
        Layer.mergeAll(
          TestDatabaseLayer({ types: [DataType.Text, Markdown.Document, Blueprint.Blueprint] }),
          makeToolResolverFromFunctions([readDocument, updateDocument]),
          makeToolExecutionServiceFromFunctions([readDocument, updateDocument]),
          AiService.model('@anthropic/claude-3-5-sonnet-20241022'),
        ).pipe(
          Layer.provideMerge(AiServiceTestingPreset('direct')),
          Layer.provideMerge(LocalFunctionExecutionService.layer),
        ),
      ),
    ),
  );
});
