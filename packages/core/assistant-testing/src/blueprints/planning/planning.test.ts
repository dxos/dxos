//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import { Effect, Layer, Option, Stream } from 'effect';

import { AiService, ConsolePrinter } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import {
  AiConversation,
  AiSession,
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

import { readTasks, updateTasks } from '../../functions';
import { type TestStep, runSteps } from '../testing';

import blueprint from './planning';

describe.runIf(process.env.DX_RUN_SLOW_TESTS === '1')('Planning Blueprint', { timeout: 120_000 }, () => {
  it.effect.only(
    'planning blueprint',
    Effect.fn(
      function* ({ expect }) {
        const { queues } = yield* QueueService;
        const { db } = yield* DatabaseService;

        const conversation = new AiConversation({
          queue: queues.create(),
        });

        const session = new AiSession();
        const printer = new ConsolePrinter({ mode: 'json' });
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

        const artifact = db.add(Markdown.makeDocument());

        let prevContent = artifact.content;
        const matchList =
          ({ includes = [], excludes = [] }: { includes: RegExp[]; excludes?: RegExp[] }) =>
          async () => {
            const { content } = await artifact.content.load();
            log.info('spec', { doc: artifact.content.target?.content });
            expect(content).not.toBe(prevContent);
            const text = content.toLowerCase();
            for (const include of includes) {
              expect(text.match(include), `does not include: ${include}`).toBeTruthy();
            }
            for (const exclude of excludes) {
              expect(text.match(exclude), `includes: ${exclude}`).toBeFalsy();
            }
            prevContent = artifact.content;
          };

        const system = 'You are a helpful assistant.';
        const steps: TestStep[] = [
          {
            system,
            prompt: trim`
              I'm building a shelf.
              Maintain a shopping list here: ${Obj.getDXN(artifact)}
              I need a hammer, nails, and a saw.
            `,
            test: matchList({
              includes: [/- \[.+hammer/, /- \[.+nails/, /- \[.+saw/],
            }),
          },
          {
            system,
            prompt: trim`
              I will need a board too.
            `,
            test: matchList({
              includes: [/- \[.+board/],
            }),
          },
          {
            system,
            prompt: trim`
              Actually I'm going to use screws and a screwdriver.
            `,
            test: matchList({
              includes: [/- \[.+screwdriver/, /- \[.+screws/],
              excludes: [/- \[.+hammer/, /- \[.+nails/],
            }),
          },
        ];

        const run = runSteps({ conversation, steps });
        yield* Effect.all([run, messageQueue, blockQueue]);
      },
      Effect.provide(
        Layer.mergeAll(
          TestDatabaseLayer({ types: [DataType.Text, Markdown.Document, Blueprint.Blueprint] }),
          makeToolResolverFromFunctions([readTasks, updateTasks]),
          makeToolExecutionServiceFromFunctions([readTasks, updateTasks]),
          AiService.model('@anthropic/claude-3-5-sonnet-20241022'),
        ).pipe(
          Layer.provideMerge(AiServiceTestingPreset('direct')),
          Layer.provideMerge(LocalFunctionExecutionService.layer),
        ),
      ),
    ),
  );
});
