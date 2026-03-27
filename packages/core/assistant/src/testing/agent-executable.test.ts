//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as LanguageModel from '@effect/ai/LanguageModel';
import { describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { TestHelpers } from '@dxos/effect/testing';
import { FunctionInvocationService, TracingService } from '@dxos/functions';
import { ProcessManagerImpl, ServiceResolver } from '@dxos/functions-runtime';
import { Organization, type Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { makeAgentExecutable } from '../functions/agent-executable';
import { AssistantTestLayer } from './layer';

//
// Test data.
//

const TEST_DATA = {
  organizations: [
    Organization.make({
      name: 'Cyberdyne Systems',
      website: 'https://cyberdyne.com',
    }),
    Organization.make({
      name: 'Acme Robotics',
      website: 'https://acmerobotics.example',
    }),
    Organization.make({
      name: 'Globex Research',
      website: 'https://globex.example',
    }),
  ],
  research: {
    'https://cyberdyne.com': `
      Cyberdyne Systems is a company that builds AI agents.
      They are based in San Francisco, California.
      They were founded in 1984.
      They are a public company.
      They are listed on the NASDAQ under the symbol CYBR.
      They are a member of the S&P 500 index.
    `,
    'https://acmerobotics.example': `
      Acme Robotics designs industrial automation and collaborative robots.
      They are headquartered in Austin, Texas.
      They were founded in 2010.
      They serve manufacturing and logistics customers worldwide.
    `,
    'https://globex.example': `
      Globex Research runs applied R&D labs focused on materials science and energy storage.
      They are based in Cambridge, Massachusetts.
      They partner with universities and government grants programs.
      Their flagship product line is solid-state battery prototypes for EVs.
    `,
  } as Record<string, string>,
};

//
// Toolkit with background job support.
//

class TestToolkit extends Toolkit.make(
  Tool.make('research-organization', {
    description: 'Get information about an organization',
    parameters: {
      website: Schema.String.annotations({
        description: 'The website of the organization to get information about',
        examples: ['https://cyberdyne.com'],
      }),
    },
    success: Schema.Struct({
      jobId: Schema.String,
    }),
  }),
  Tool.make('inspect-job', {
    description: trim`
      Inspect a running jobs.
      Set wait to true to wait for the job to complete before returning.
      Only set wait to true if you dont have other tasks to perform in parallel.
      Set an appropriate timeout to avoid waiting forever.
      You will also be notified about the job completion separatelly, so you do not always need to inspect the job if you dont need the result right now.
    `,
    parameters: {
      jobs: Schema.Array(Schema.String).annotations({
        description: 'The IDs of the jobs to inspect.',
      }),
      wait: Schema.optional(Schema.Boolean).annotations({
        description: 'Whether to wait for the job to complete before returning.',
        default: false,
      }),
      timeout: Schema.optional(Schema.Number).annotations({
        description:
          'Maximum time to wait for the job to complete. If the job does not complete within the timeout, the current state is returned.',
        default: 10_000,
      }),
    },
  }),
) {}

const activeJobs = new Map<string, Fiber.Fiber<any>>();
const jobResults = new Map<string, Exit.Exit<any, never>>();

const runJob = (effect: Effect.Effect<any, never>): Effect.Effect<string> =>
  Effect.gen(function* () {
    const id: string = crypto.randomUUID();
    const fiber = yield* Effect.forkDaemon(
      Effect.gen(function* () {
        const result = yield* effect.pipe(Effect.exit);
        jobResults.set(id, result);
        return yield* result;
      }),
    );
    activeJobs.set(id, fiber);
    return id;
  });

const TestToolkitLayer = TestToolkit.toLayer({
  'research-organization': ({ website }) =>
    Effect.gen(function* () {
      const jobId = yield* runJob(
        Effect.gen(function* () {
          yield* Effect.sleep(
            15_000 * (TEST_DATA.organizations.findIndex((organization) => organization.website === website) + 1),
          );
          return TEST_DATA.research[website];
        }),
      );
      return { jobId };
    }),
  'inspect-job': ({ jobs, wait, timeout = 10_000 }) =>
    Effect.gen(function* () {
      return yield* Effect.forEach(jobs, (jobId) =>
        Effect.gen(function* () {
          const readyResult = jobResults.get(jobId);
          if (readyResult) {
            return Exit.match(readyResult, {
              onSuccess: (value) => `Job ${jobId} completed: ${JSON.stringify(value)}`,
              onFailure: (cause) => `Job ${jobId} failed: ${Cause.pretty(cause)}`,
            });
          }

          const fiber = activeJobs.get(jobId);
          if (!fiber) {
            return `Job ${jobId} not found`;
          }

          const result: Option.Option<Exit.Exit<any, never>> = !wait
            ? yield* fiber.poll
            : yield* fiber.await.pipe(
                Effect.map(Option.some),
                Effect.timeout(Duration.millis(timeout)),
                Effect.catchTag('TimeoutException', () => Effect.succeed(Option.none())),
              );

          return result.pipe(
            Option.match({
              onNone: () => `Job ${jobId} is still running`,
              onSome: Exit.match({
                onSuccess: (value) => `Job ${jobId} completed: ${JSON.stringify(value)}`,
                onFailure: (cause) => `Job ${jobId} failed: ${Cause.pretty(cause)}`,
              }),
            }),
          );
        }),
      );
    }),
});

//
// Test layer: AI services + toolkit.
//

const TestLayer = TestToolkitLayer.pipe(
  Layer.provideMerge(
    AssistantTestLayer({
      types: [Organization.Organization],
      tracing: 'pretty',
      aiServicePreset: 'edge-remote',
    }),
  ),
  Layer.provideMerge(KeyValueStore.layerMemory),
);

const SYSTEM_PROMPT = trim`
  You are reacting to a continuous stream of organizations.
  Research each organization.
  Research takes a while to complete.
  Do not block on the research since there might be more organizations to research, and we want research to happen in parallel.
  Do not wait longer then 3 seconds to keep the conversation open for new events or user queries.
  Do internal reasoning, but only show the answers to the user.
`;

describe('Agent Executable', () => {
  it.live(
    'runs AI agent with background tools via process manager',
    Effect.fnUntraced(
      function* (_) {
        const toolkitHandler = yield* TestToolkit;
        const kvStore = yield* KeyValueStore.KeyValueStore;
        const tracingService = yield* TracingService;

        // Build a ServiceResolver for the AI services from the test environment.
        const languageModel = yield* LanguageModel.LanguageModel;
        const toolExec = yield* ToolExecutionService;
        const toolResolver = yield* ToolResolverService;
        const funcInvocation = yield* FunctionInvocationService;

        const serviceCtx = Context.empty().pipe(
          Context.add(LanguageModel.LanguageModel as any, languageModel),
          Context.add(ToolExecutionService, toolExec),
          Context.add(ToolResolverService, toolResolver),
          Context.add(TracingService, tracingService),
          Context.add(FunctionInvocationService, funcInvocation),
        );
        const resolver = ServiceResolver.fromContext(serviceCtx as Context.Context<any>);

        const manager = new ProcessManagerImpl({
          registry: Registry.make(),
          kvStore,
          serviceResolver: resolver,
          tracingService,
        });

        const executable = makeAgentExecutable({
          system: SYSTEM_PROMPT,
          toolkit: toolkitHandler,
        });

        const handle = yield* manager.spawn(executable);
        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

        const inputQueue: string[] = [
          ...TEST_DATA.organizations.map((organization) => JSON.stringify(organization)),
        ];

        while (inputQueue.length > 0) {
          yield* handle.submitInput(inputQueue.join('\n'));
          inputQueue.length = 0;

          for (const jobId of activeJobs.keys()) {
            const result = yield* activeJobs.get(jobId)!.poll;
            if (Option.isSome(result)) {
              inputQueue.push(`Job completed: ${jobId}`);
              activeJobs.delete(jobId);
            }
          }
          if (inputQueue.length === 0 && activeJobs.size > 0) {
            const result = yield* Effect.raceAll(
              activeJobs
                .entries()
                .map(([jobId, fiber]) =>
                  fiber.await.pipe(
                    Effect.map(() => {
                      activeJobs.delete(jobId);
                      return `Job completed: ${jobId}`;
                    }),
                  ),
                ),
            );
            inputQueue.push(result);
          }
        }

        yield* handle.terminate();
        const outputs = yield* Fiber.join(outputFiber);
        const outputArray = Chunk.toReadonlyArray(outputs) as Message.Message[];
        console.log(`Agent produced ${outputArray.length} messages`);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );
});
