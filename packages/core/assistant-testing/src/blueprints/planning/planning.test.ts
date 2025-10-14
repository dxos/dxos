//
// Copyright 2025 DXOS.org
//

import * as Test from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import {
  AiConversation,
  type ContextBinding,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import {
  ComputeEventLogger,
  DatabaseService,
  FunctionImplementationResolver,
  FunctionInvocationService,
  QueueService,
  TracingService,
} from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { log } from '@dxos/log';
import { Markdown } from '@dxos/plugin-markdown/types';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { readTasks, updateTasks } from '../../functions';
import { type TestStep, runSteps, testToolkit } from '../testing';

import blueprint from './planning';

Test.describe('Planning Blueprint', { timeout: 120_000 }, () => {
  Test.it.effect(
    'planning blueprint',
    Effect.fn(
      function* ({ expect }) {
        const conversation = new AiConversation({
          queue: yield* QueueService.createQueue<DataType.Message | ContextBinding>(),
        });

        yield* DatabaseService.add(blueprint);
        yield* Effect.promise(() =>
          conversation.context.bind({
            blueprints: [Ref.make(blueprint)],
          }),
        );

        const artifact = yield* DatabaseService.add(Markdown.makeDocument());
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

        yield* runSteps(conversation, steps);
      },
      Effect.provide(
        Layer.mergeAll(
          TestDatabaseLayer({ types: [DataType.Text, Markdown.Document, Blueprint.Blueprint] }),
          makeToolResolverFromFunctions([readTasks, updateTasks], testToolkit),
          makeToolExecutionServiceFromFunctions(testToolkit, testToolkit.toLayer({}) as any),
          AiService.model('@anthropic/claude-3-5-sonnet-20241022'),
        ).pipe(
          Layer.provideMerge(
            FunctionInvocationService.layerTestMocked({ functions: [readTasks, updateTasks] }).pipe(
              Layer.provideMerge(ComputeEventLogger.layerFromTracing),
              Layer.provideMerge(TracingService.layerNoop),
            ),
          ),
          Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions: [readTasks, updateTasks] })),
          Layer.provideMerge(TestDatabaseLayer({ types: [DataType.Text, Markdown.Document, Blueprint.Blueprint] })),
          Layer.provideMerge(AiServiceTestingPreset('direct')),
        ),
      ),
      TestHelpers.taggedTest('llm'),
    ),
  );
});
