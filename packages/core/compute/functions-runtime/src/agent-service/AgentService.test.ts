//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import { describe, it } from '@effect/vitest';
import { Context, Fiber, Layer } from 'effect';
import { Deferred } from 'effect';
import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import { expect } from 'vitest';

import { MemoizedAiService } from '@dxos/ai/testing';
import { PartialBlock } from '@dxos/assistant';
import { Blueprint, Operation, OperationHandlerSet, ServiceResolver, Trace } from '@dxos/compute';
import { Process } from '@dxos/compute';
import { Feed, Filter } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { DXN, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Message, Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import * as AgentService from './AgentService';

EntityId.dangerouslyDisableRandomness();

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

interface ResearchTask {
  website: string;
  deferred: Deferred.Deferred<string>;
}

class ResearchService extends Context.Tag('@dxos/functions-runtime/ResearchService')<
  ResearchService,
  {
    research: (website: string) => Effect.Effect<string>;
    waitForTaskToAppear: () => Effect.Effect<void>;
    completeOneTask: () => Effect.Effect<void>;
    completeAllTasks: () => Effect.Effect<void>;
  }
>() { }

const makeResearchService = Layer.effect(ResearchService, Effect.gen(function* () {
  const taskSignal = yield* Queue.unbounded<void>();
  const tasks: ResearchTask[] = [];
  const complete = (task: ResearchTask) =>
    Effect.gen(function* () {
      log.info('complete research', { website: task.website });
      const result = TEST_DATA.research[task.website];
      if (!result) {
        yield* Effect.die(new Error(`No research found for ${task.website}`));
        return;
      }
      yield* Deferred.succeed(task.deferred, result);
    });

  return ResearchService.of({
    research: (website: string) =>
      Effect.gen(function* () {
        log.info('start research', { website });
        const task = yield* Deferred.make<string>();
        tasks.push({ website, deferred: task });
        yield* Queue.offer(taskSignal, undefined);
        return yield* Deferred.await(task);
      }),
    waitForTaskToAppear: () => Queue.take(taskSignal).pipe(Effect.asVoid),
    completeOneTask: () =>
      Effect.gen(function* () {
        const task = tasks.shift();
        if (!task) {
          return;
        }
        yield* complete(task);
      }),
    completeAllTasks: () =>
      Effect.gen(function* () {
        for (const task of tasks) {
          yield* complete(task);
        }
      }),
  });
}));

const Research = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.research'),
    name: 'Research',
    description: 'Research an organization',
  },
  input: Schema.Struct({
    website: Schema.String.annotations({ description: 'The website of the organization to research' }),
  }),
  output: Schema.String,
  services: [ResearchService],
});

const handlers = OperationHandlerSet.make(
  Research.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ website }) {
        const research = yield* ResearchService;
        const result = yield* research.research(website);
        return result;
      }),
    ),
  ),
);

const ResearchBlueprint = Blueprint.make({
  key: 'org.dxos.blueprint.research',
  name: 'Research',
  tools: Blueprint.toolDefinitions({ operations: [Research] }),
});

const TestLayer = AssistantTestLayer({
  types: [Organization.Organization, Feed.Feed, Blueprint.Blueprint],
  tracing: 'pretty',
  aiServicePreset: 'edge-remote',
  operationHandlers: [handlers],
  blueprints: [ResearchBlueprint],
  enableToolBackgrounding: false,
  extraServices: makeResearchService,
});

describe('Agent Service', () => {
  it.effect(
    'can answer a question',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession();
        yield* agent.submitPrompt('What is the capital of France?');
        yield* agent.waitForCompletion();

        const messages = yield* Feed.runQuery(agent.feed, Filter.type(Message.Message));
        const text = messages.map(Message.extractText).join('\n');
        expect(text.toLocaleLowerCase()).toContain('paris');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined },
  );

  it.scoped(
    'tool call',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          blueprints: [ResearchBlueprint],
        });
        yield* agent.submitPrompt(`Research ${JSON.stringify(TEST_DATA.organizations[0])}`);
        const completionFiber = yield* agent.waitForCompletion().pipe(Effect.fork);

        const researchService = yield* ServiceResolver.resolve(ResearchService, {});
        yield* researchService.waitForTaskToAppear();
        yield* researchService.completeOneTask();
        yield* Fiber.join(completionFiber);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined },
  );

  // TODO(dmaretskyi): Figure out how to make it not sleep for 45 seconds.
  it.scoped.skip(
    'runs AI agent with background tools via process manager',
    Effect.fnUntraced(
      function* (_) {
        const registry = yield* Registry.AtomRegistry;
        const monitor = yield* Process.ProcessMonitorService;
        registry.subscribe(monitor.processTreeAtom, (tree) => {
          console.log(`\n----- Process tree -----\n${Process.prettyProcessTree(tree)}\n-----------------\n`);
        });

        const agent = yield* AgentService.createSession({
          blueprints: [ResearchBlueprint],
        });

        let ephemeralEventCount = 0;
        yield* agent.subscribeEphemeral().pipe(
          Stream.runForEach((msg) =>
            Effect.gen(function* () {
              for (const event of msg.events) {
                if (Trace.isOfType(PartialBlock, event)) {
                  ephemeralEventCount++;
                }
              }
            }),
          ),
          Effect.fork,
        );

        for (const org of TEST_DATA.organizations) {
          yield* agent.submitPrompt(JSON.stringify(org));
        }
        yield* agent.submitPrompt('When all research is complete, print 1-sentence summary for each organization.');
        yield* agent.waitForCompletion();
        expect(ephemeralEventCount).toBeGreaterThan(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );
});
