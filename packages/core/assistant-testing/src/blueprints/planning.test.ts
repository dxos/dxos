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
import { Markdown } from '@dxos/plugin-markdown/types';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import blueprint from './planning';
import { readDocument, writeDocument } from '../functions';
import { runSteps, type TestStep } from './testing';

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('Planning Blueprint', { timeout: 120_000 }, () => {
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
          session.userMessage.on((message) => printer.printMessage(message));
          session.message.on((message) => printer.printMessage(message));
          session.block.on((block) => printer.printContentBlock(block));
          session.streamEvent.on((part) => {
            log('part', { part });
          });
        });

        db.add(blueprint);
        yield* Effect.promise(() => conversation.context.bind({ blueprints: [Ref.make(blueprint)] }));

        const artifact = db.add(Markdown.make());

        let prevContent = artifact.content;
        const matchList = (list: Record<string, boolean>) => async () => {
          const { content } = await artifact.content.load();
          log.info('spec', { doc: artifact.content.target?.content });
          expect(content).not.toBe(prevContent);
          Object.entries(list).forEach(([item, expected]) => {
            expect(content.toLowerCase().includes(item), `item=${item} included=${expected}`).toBe(expected);
          });

          prevContent = artifact.content;
        };

        const systemPrompt = 'You are a helpful assistant.';
        const steps: TestStep[] = [
          {
            systemPrompt,
            prompt: trim`
              I'm building a shelf.
              Maintain a shopping list here: ${Obj.getDXN(artifact)}
              I need a hammer, nails, and a saw.
            `,
            test: matchList({
              hammer: true,
              nails: true,
              saw: true,
            }),
          },
          {
            systemPrompt,
            prompt: trim`
              I will need a board too.
            `,
            test: matchList({
              hammer: true,
              nails: true,
              saw: true,
              board: true,
            }),
          },
          {
            systemPrompt,
            prompt: trim`
              Actually I'm going to use screws and a screwdriver.
            `,
            test: matchList({
              hammer: false,
              nails: false,
              saw: true,
              board: true,
              screwdriver: true,
              screws: true,
            }),
          },
        ];

        yield* runSteps({ conversation, steps });
      },
      Effect.provide(
        Layer.mergeAll(
          TestDatabaseLayer({ types: [Markdown.Doc, DataType.Text, Blueprint.Blueprint] }),
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
