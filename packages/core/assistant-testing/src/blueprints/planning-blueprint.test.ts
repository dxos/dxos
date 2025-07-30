//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';

import { AiService, ConsolePrinter } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Conversation, makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { DatabaseService, QueueService } from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { log } from '@dxos/log';
import { Document } from '@dxos/plugin-markdown/types';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import blueprint from './planning-blueprint';
import { readDocument, writeDocument } from '../functions';

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('Planning Blueprint', { timeout: 120_000 }, () => {
  // it.effect.only(
  //   'building a shelf',
  //   Effect.fn(function* ({ expect }) {
  //     console.log('!!!!!!!');
  //     expect(true).toBe(true);
  //   }),
  // );

  it.effect.only(
    'building a shelf',
    Effect.fn(
      function* ({ expect }) {
        const { queues } = yield* QueueService;
        const { db } = yield* DatabaseService;

        const conversation = new Conversation({
          queue: queues.create(),
        });

        const printer = new ConsolePrinter({ mode: 'json' });
        conversation.onBegin.on((session) => {
          session.message.on((message) => printer.printMessage(message));
          session.userMessage.on((message) => printer.printMessage(message));
          session.block.on((block) => printer.printContentBlock(block));
          session.streamEvent.on((part) => {
            // log.info('part', { part });
          });
        });

        db.add(blueprint);
        yield* Effect.promise(() => conversation.context.bind({ blueprints: [Ref.make(blueprint)] }));

        const artifact = db.add(Document.make());
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

        // {
        //   yield* conversation.run({
        //     prompt: trim`
        //       I will need a board too.
        //     `,
        //   });
        //   log.info('conv 2', {
        //     messages: yield* Effect.promise(() => conversation.getHistory()),
        //   });
        //   log.info('spec 2', { doc: artifact.content.target?.content });
        //   expect(artifact.content).not.toBe(prevContent);
        //   prevContent = artifact.content;
        // }

        // {
        //   yield* conversation.run({
        //     prompt: trim`
        //       Actually lets use screws and a screwdriver.
        //     `,
        //   });
        //   log.info('conv 3', {
        //     messages: yield* Effect.promise(() => conversation.getHistory()),
        //   });
        //   log.info('spec 3', { doc: artifact.content.target?.content });
        //   expect(artifact.content).not.toBe(prevContent);
        //   prevContent = artifact.content;
        // }

        // const { content } = yield* Effect.promise(() => artifact.content.load());
        // Object.entries({
        //   screwdriver: true,
        //   screws: true,
        //   board: true,
        //   saw: true,
        //   hammer: false,
        //   nails: false,
        // }).forEach(([item, expected]) => {
        //   expect(content.toLowerCase().includes(item), `item=${item} included=${expected}`).toBe(expected);
        // });
      },
      Effect.provide(
        Layer.mergeAll(
          TestDatabaseLayer({ types: [Document.Document, DataType.Text, Blueprint.Blueprint] }),
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
