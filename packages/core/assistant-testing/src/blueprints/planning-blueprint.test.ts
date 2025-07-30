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
  it.effect.only(
    'building a shelf',
    Effect.fn(
      function* ({ expect }) {
        const { queues } = yield* QueueService;
        const { db } = yield* DatabaseService;

        const systemPrompt = 'You are a helpful assistant.';

        const conversation = new Conversation({
          queue: queues.create(),
        });

        const printer = new ConsolePrinter({ mode: 'json' });
        conversation.onBegin.on((session) => {
          session.message.on((message) => printer.printMessage(message));
          session.userMessage.on((message) => printer.printMessage(message));
          session.block.on((block) => printer.printContentBlock(block));
          session.streamEvent.on((part) => {
            log('part', { part });
          });
        });

        db.add(blueprint);
        yield* Effect.promise(() => conversation.context.bind({ blueprints: [Ref.make(blueprint)] }));

        const artifact = db.add(Document.make());

        // TODO(burdon): Create assistant testing pattern.
        const prompts = [
          trim`
            I'm building a shelf.
            Maintain a shopping list here: ${Obj.getDXN(artifact)}
            I need a hammer, nails, and a saw.
          `,
          trim`
            I will need a board too.
          `,
          trim`
            Actually lets use screws and a screwdriver.
          `,
        ];

        let prevContent = artifact.content;
        for (const prompt of prompts) {
          yield* conversation.run({
            systemPrompt,
            prompt,
          });
          log.info('conv', { messages: yield* Effect.promise(() => conversation.getHistory()) });
          log.info('spec', { doc: artifact.content.target?.content });
          expect(artifact.content).not.toBe(prevContent);
          prevContent = artifact.content;
        }

        const list = {
          hammer: false,
          nails: false,
          saw: true,
          board: true,
          screwdriver: true,
          screws: true,
        };

        const { content } = yield* Effect.promise(() => artifact.content.load());
        Object.entries(list).forEach(([item, expected]) => {
          expect(content.toLowerCase().includes(item), `item=${item} included=${expected}`).toBe(expected);
        });
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
