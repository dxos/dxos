//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import { expect } from 'vitest';

import { MemoizedAiService } from '@dxos/ai/testing';
import { PartialBlock } from '@dxos/assistant';
import { Blueprint, Operation, OperationHandlerSet, ServiceResolver, Trace } from '@dxos/compute';
import { Feed, Filter } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { DXN, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Message, Organization } from '@dxos/types';

import * as AgentService from './AgentService';
import { ProcessManager } from '../index';

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
  id: string;
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
      log.info('complete research', { id: task.id, website: task.website });
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
        const id = crypto.randomUUID();
        const task: ResearchTask = { id, website, deferred: yield* Deferred.make<string>() };
        log.info('start research', { id, website });
        tasks.push(task);
        yield* Queue.offer(taskSignal, undefined);
        return yield* Deferred.await(task.deferred).pipe(Effect.onInterrupt(() => Effect.sync(() => {
          log.info('interrupt research', { id, website: task.website });
          tasks.splice(tasks.indexOf(task), 1);
        })));
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
        while (tasks.length > 0) {
          const task = tasks.shift();
          if (!task) {
            return;
          }
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

const assistantTestLayerOptions = {
  types: [Organization.Organization, Feed.Feed, Blueprint.Blueprint],
  tracing: 'pretty' as const,
  aiServicePreset: 'edge-remote' as const,
  operationHandlers: [handlers],
  blueprints: [ResearchBlueprint],
  extraServices: makeResearchService,
};

const TestLayer = AssistantTestLayer({
  ...assistantTestLayerOptions,
  enableToolBackgrounding: false,
});

const BackgroundTestLayer = AssistantTestLayer({
  ...assistantTestLayerOptions,
  enableToolBackgrounding: true,
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

        const researchService = yield* ServiceResolver.resolve(ResearchService, {});
        yield* researchService.waitForTaskToAppear();
        yield* researchService.completeOneTask();
        yield* agent.waitForCompletion()
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined },
  );

  it.scoped(
    'restart during tool call',
    Effect.fnUntraced(
      function* (_) {
        let agent = yield* AgentService.createSession({
          blueprints: [ResearchBlueprint],
        });
        yield* agent.submitPrompt(`Research ${JSON.stringify(TEST_DATA.organizations[0])}`);

        const researchService = yield* ServiceResolver.resolve(ResearchService, {});
        yield* researchService.waitForTaskToAppear();

        const processManager = yield* ProcessManager.ProcessManagerService;
        yield* processManager.shutdown();
        yield* processManager.startup();
        yield* AgentService.hydrate();

        // Hydrate returns immediately; redelivery re-issues the research tool on a fresh child.
        // Drain all queued tasks (orphaned pre-restart + live child).
        yield* researchService.waitForTaskToAppear();
        yield* researchService.completeAllTasks();

        agent = yield* AgentService.getSession(agent.feed);
        yield* agent.waitForCompletion();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined },
  );

  it.scoped(
    'recovers queued tool results after reload',
    Effect.fnUntraced(
      function* (_) {
        let agent = yield* AgentService.createSession({
          blueprints: [ResearchBlueprint],
        });
        yield* agent.submitPrompt(`Research ${JSON.stringify(TEST_DATA.organizations[0])}`);

        const researchService = yield* ServiceResolver.resolve(ResearchService, {});
        yield* researchService.waitForTaskToAppear();
        yield* researchService.completeOneTask();

        const processManager = yield* ProcessManager.ProcessManagerService;
        yield* processManager.shutdown();
        yield* processManager.startup();
        yield* AgentService.hydrate();

        // Redelivery may re-issue tools from the interrupted turn.
        yield* researchService.waitForTaskToAppear();
        yield* researchService.completeAllTasks();

        agent = yield* AgentService.getSession(agent.feed);
        yield* agent.waitForCompletion();

        const messages = yield* Feed.runQuery(agent.feed, Filter.type(Message.Message));
        const text = messages.map(Message.extractText).join('\n');
        expect(text.toLocaleLowerCase()).toContain('cyberdyne');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined },
  );

  it.scoped(
    'rehydrates an idle session and replays conversation history',
    Effect.fnUntraced(
      function* (_) {
        let agent = yield* AgentService.createSession();
        yield* agent.submitPrompt('What is the capital of France? Reply with just the city name.');
        yield* agent.waitForCompletion();

        // Simulate app teardown + reboot while the session sits idle (nothing in-flight).
        const processManager = yield* ProcessManager.ProcessManagerService;
        yield* processManager.shutdown();
        yield* processManager.startup();
        yield* AgentService.hydrate();

        // The rehydrated agent is bound to the same feed, so a follow-up that only makes sense
        // with prior context resolves against the pre-restart turn.
        agent = yield* AgentService.getSession(agent.feed);
        yield* agent.submitPrompt('What country did I just ask you about? Reply with just the country name.');
        yield* agent.waitForCompletion();

        const messages = yield* Feed.runQuery(agent.feed, Filter.type(Message.Message));
        const text = messages.map(Message.extractText).join('\n');
        expect(text.toLocaleLowerCase()).toContain('paris');
        expect(text.toLocaleLowerCase()).toContain('france');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined },
  );

  it.scoped(
    'hydrate is a no-op when there are no persisted agents',
    Effect.fnUntraced(
      function* (_) {
        // Reboot over an empty store: hydrate must neither throw nor block, and is idempotent.
        const processManager = yield* ProcessManager.ProcessManagerService;
        yield* processManager.shutdown();
        yield* processManager.startup();
        yield* AgentService.hydrate();
        yield* AgentService.hydrate();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'runs AI agent with background tools via process manager',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          blueprints: [ResearchBlueprint],
        });

        const researchService = yield* ServiceResolver.resolve(ResearchService, {});
        const taskDrainer = yield* Effect.gen(function* () {
          yield* researchService.waitForTaskToAppear();
          yield* researchService.completeOneTask();
        }).pipe(Effect.forever, Effect.fork);

        let ephemeralEventCount = 0;
        const ephemeralFiber = yield* agent.subscribeEphemeral().pipe(
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
        // TODO(dmaretskyi): wait until settles and only now start draining
        yield* agent.waitForCompletion();

        yield* Fiber.interrupt(taskDrainer);
        yield* Fiber.interrupt(ephemeralFiber);

        expect(ephemeralEventCount).toBeGreaterThan(0);
      },
      Effect.provide(BackgroundTestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 120_000 : undefined },
  );
});
