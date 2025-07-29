//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';

import { AiService, ConsolePrinter } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Conversation, makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { DatabaseService, QueueService } from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { log } from '@dxos/log';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { DESIGN_BLUEPRINT, TASK_BLUEPRINT } from './blueprints';
import { readDocument, writeDocument } from '../functions';

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('Blueprint', { timeout: 120_000 }, () => {
  it.effect(
    'spec blueprint',
    Effect.fn(
      function* () {
        const { queues } = yield* QueueService;
        const { db } = yield* DatabaseService;
        const printer = new ConsolePrinter();
        const conversation = new Conversation({
          queue: queues.create(),
        });
        conversation.onBegin.on((session) => {
          session.message.on((message) => printer.printMessage(message));
          session.userMessage.on((message) => printer.printMessage(message));
          session.block.on((block) => printer.printContentBlock(block));
        });

        const blueprint = db.add(DESIGN_BLUEPRINT);
        yield* Effect.promise(() => conversation.context.bind({ blueprints: [Ref.make(blueprint)] }));

        const artifact = db.add(
          Obj.make(DocumentType, { content: Ref.make(Obj.make(DataType.Text, { content: 'Hello, world!' })) }),
        );
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
        });
        log.info('spec 1', { doc: artifact });
        expect(artifact.content).not.toBe(prevContent);
        prevContent = artifact.content;

        yield* conversation.run({
          prompt: trim`
        I want this to be built on top of Durable Objects and SQLite database. Let's adjust the spec to reflect this.
      `,
        });
        log.info('spec 2', { doc: artifact });
        expect(artifact.content).not.toBe(prevContent);
      },
      Effect.provide(
        Layer.mergeAll(
          TestDatabaseLayer({ types: [DocumentType, DataType.Text, Blueprint.Blueprint] }),
          makeToolResolverFromFunctions([readDocument, writeDocument]),
          makeToolExecutionServiceFromFunctions([readDocument, writeDocument]),
          AiService.model('@anthropic/claude-3-5-sonnet-20241022').pipe(
            Layer.provideMerge(AiServiceTestingPreset('direct')),
          ),
        ),
      ),
    ),
  );

  it.effect.only(
    'building a shelf',
    Effect.fn(
      function* ({ expect }) {
        const { queues } = yield* QueueService;
        const { db } = yield* DatabaseService;

        const printer = new ConsolePrinter({ mode: 'json' });
        const conversation = new Conversation({
          queue: queues.create(),
        });
        conversation.onBegin.on((session) => {
          session.message.on((message) => printer.printMessage(message));
          session.userMessage.on((message) => printer.printMessage(message));
          session.block.on((block) => printer.printContentBlock(block));
          session.streamEvent.on((part) => {
            log.info('part', { part });
          });
        });

        const blueprint = db.add(TASK_BLUEPRINT);
        yield* Effect.promise(() => conversation.context.bind({ blueprints: [Ref.make(blueprint)] }));

        const artifact = db.add(
          Obj.make(DocumentType, { content: Ref.make(Obj.make(DataType.Text, { content: '' })) }),
        );

        let prevContent = artifact.content;
        {
          yield* conversation.run({
            prompt: trim`
            I'm building a shelf.
            I need a hammer, nails, and a saw.
            Store the shopping list in ${Obj.getDXN(artifact)}
          `,
          });
          log.info('conv 1', {
            messages: yield* Effect.promise(() => conversation.getHistory()),
          });
          log.info('spec 1', { doc: artifact.content.target?.content });
          expect(artifact.content).not.toBe(prevContent);
          prevContent = artifact.content;
        }

        {
          yield* conversation.run({
            prompt: trim`
            I will need a board too.
          `,
          });
          log.info('conv 2', {
            messages: yield* Effect.promise(() => conversation.getHistory()),
          });
          log.info('spec 2', { doc: artifact.content.target?.content });
          expect(artifact.content).not.toBe(prevContent);
          prevContent = artifact.content;
        }

        {
          yield* conversation.run({
            prompt: trim`
            Actually lets use screws and a screwdriver.
          `,
          });
          log.info('conv 3', {
            messages: yield* Effect.promise(() => conversation.getHistory()),
          });
          log.info('spec 3', { doc: artifact.content.target?.content });
          expect(artifact.content).not.toBe(prevContent);
          prevContent = artifact.content;
        }

        const { content } = yield* Effect.promise(() => artifact.content.load());
        Object.entries({
          screwdriver: true,
          screws: true,
          board: true,
          saw: true,
          hammer: false,
          nails: false,
        }).forEach(([item, expected]) => {
          expect(content.toLowerCase().includes(item), `item=${item} included=${expected}`).toBe(expected);
        });
      },
      Effect.provide(
        Layer.mergeAll(
          TestDatabaseLayer({ types: [DocumentType, DataType.Text, Blueprint.Blueprint] }),
          makeToolResolverFromFunctions([readDocument, writeDocument]),
          makeToolExecutionServiceFromFunctions([readDocument, writeDocument]),
          AiService.model('@anthropic/claude-3-5-sonnet-20241022').pipe(
            Layer.provideMerge(AiServiceTestingPreset('direct')),
          ),
        ),
      ),
    ),
  );
});
