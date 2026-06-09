//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as TestClock from 'effect/TestClock';
import { expect } from 'vitest';

import { MemoizedAiService } from '@dxos/ai/testing';
import { PartialBlock } from '@dxos/assistant';
import { Blueprint, Operation, OperationHandlerSet, ServiceResolver, Trace } from '@dxos/compute';
import { Feed, Filter, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Message, Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import { ProcessManager } from '../index';
import * as ResearchService from '../testing/ResearchService';
import * as AgentService from './AgentService';

EntityId.dangerouslyDisableRandomness();

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
  services: [ResearchService.ResearchService],
});

const handlers = OperationHandlerSet.make(
  Research.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ website }) {
        const research = yield* ResearchService.ResearchService;
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
  extraServices: ResearchService.layer,
};

const TestLayer = ({ enableToolBackgrounding = false }: { enableToolBackgrounding?: boolean } = {}) =>
  AssistantTestLayer({
    ...assistantTestLayerOptions,
    enableToolBackgrounding,
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
      Effect.provide(TestLayer()),
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
        yield* agent.submitPrompt(`Research ${JSON.stringify(ResearchService.getTestData().organizations[0])}`);

        const researchService = yield* ServiceResolver.resolve(ResearchService.ResearchService, {});
        yield* researchService.waitForTaskToAppear();
        yield* researchService.completeOneTask();
        yield* agent.waitForCompletion();
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined },
  );

  it.scoped(
    'can be stopped while waiting for a tool call',
    Effect.fnUntraced(
      function* (_) {
        let agent = yield* AgentService.createSession({
          blueprints: [ResearchBlueprint],
        });
        yield* agent.submitPrompt(`Research ${JSON.stringify(ResearchService.getTestData().organizations[0])}`);
        const researchService = yield* ServiceResolver.resolve(ResearchService.ResearchService, {});
        yield* researchService.waitForTaskToAppear();

        yield* agent.terminate();
        expect(researchService.getTasks().map((task) => task.state)).toEqual(['interrupted']);
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'restart during tool call',
    Effect.fnUntraced(
      function* (_) {
        let agent = yield* AgentService.createSession({
          blueprints: [ResearchBlueprint],
        });
        yield* agent.submitPrompt(`Research ${JSON.stringify(ResearchService.getTestData().organizations[0])}`);

        const researchService = yield* ServiceResolver.resolve(ResearchService.ResearchService, {});
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
      Effect.provide(TestLayer()),
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
        yield* agent.submitPrompt(`Research ${JSON.stringify(ResearchService.getTestData().organizations[0])}`);

        const researchService = yield* ServiceResolver.resolve(ResearchService.ResearchService, {});
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
      Effect.provide(TestLayer()),
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
      Effect.provide(TestLayer()),
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
      Effect.provide(TestLayer()),
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

        const researchService = yield* ServiceResolver.resolve(ResearchService.ResearchService, {});
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

        for (const org of ResearchService.getTestData().organizations) {
          yield* agent.submitPrompt(JSON.stringify(org));
        }
        yield* agent.submitPrompt('When all research is complete, print 1-sentence summary for each organization.');
        // TODO(dmaretskyi): wait until settles and only now start draining
        yield* agent.waitForCompletion();

        yield* Fiber.interrupt(taskDrainer);
        yield* Fiber.interrupt(ephemeralFiber);

        expect(ephemeralEventCount).toBeGreaterThan(0);
      },
      Effect.provide(TestLayer({ enableToolBackgrounding: true })),
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 120_000 : undefined },
  );

  //
  // Alarm e2e (memoized LLM).
  //

  const ALARM_SYSTEM_PROMPT = trim`
You are a helpful assistant with access to alarm tools (set-alarm, get-current-date).
When asked to set an alarm, you MUST call the set-alarm tool with the requested duration.
Do not pretend to set an alarm in text — always use the set-alarm tool.
After the tool succeeds, briefly confirm the alarm was scheduled and stop.
When you receive a wake-up notification that your alarm fired, acknowledge it briefly in text.
`;

  const AlarmTestLayer = AssistantTestLayer({
    types: [Organization.Organization, Feed.Feed],
    systemPrompt: ALARM_SYSTEM_PROMPT,
    aiServicePreset: 'edge-remote',
    model: 'ai.claude.model.claude-opus-4-6',
  });

  describe('alarms', () => {
    it.scoped(
      'agent schedules a self-wake and resumes when its alarm fires (TestClock)',
      Effect.fnUntraced(
        function* (_) {
          const agent = yield* AgentService.createSession({});

          yield* agent.submitPrompt('Use the set-alarm tool to schedule a wake-up in 1 hour.');

          // First request: the agent calls `set-alarm` then finishes, leaving a self-wake armed ~1h out.
          yield* driveUntil(countBlocks(agent.feed).pipe(Effect.map(({ setAlarmCalls }) => setAlarmCalls >= 1)));
          expect((yield* countBlocks(agent.feed)).setAlarmCalls).toBe(1);

          // The process is hibernating until the self-wake fires. Advancing the clock past it resumes
          // the agent, which produces a second response.
          yield* TestClock.adjust(Duration.hours(1));
          yield* driveUntil(countBlocks(agent.feed).pipe(Effect.map(({ assistantTexts }) => assistantTexts >= 2)));
          yield* agent.waitForCompletion();

          const final = yield* countBlocks(agent.feed);
          expect(final.setAlarmCalls).toBe(1);
          expect(final.assistantTexts).toBeGreaterThanOrEqual(2);
        },
        Effect.provide(AlarmTestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: MemoizedAiService.isGenerationEnabled() ? 240_000 : 60_000 },
    );
  });
});

/**
 * Summarizes assistant text blocks and tool-call blocks persisted to the conversation feed.
 */
const countBlocks = (feed: Feed.Feed) =>
  Effect.gen(function* () {
    const queryResult = yield* Feed.query(feed, Filter.type(Message.Message));
    const messages = (yield* Effect.promise(() => queryResult.run())).filter(Obj.instanceOf(Message.Message));
    let assistantTexts = 0;
    let setAlarmCalls = 0;
    for (const message of messages) {
      for (const block of message.blocks) {
        if (message.sender.role === 'assistant' && block._tag === 'text') {
          assistantTexts++;
        }
        if (block._tag === 'toolCall' && block.name === 'set-alarm') {
          setAlarmCalls++;
        }
      }
    }
    return { assistantTexts, setAlarmCalls };
  });

/**
 * Polls until `predicate` holds. Each iteration advances the TestClock (for alarm scheduling).
 * Live LLM generation needs real wall time between polls; memoized runs flush the event loop
 * via a 0ms timer so Promise-based ECHO operations can complete between checks.
 */
const driveUntil = <R>(predicate: Effect.Effect<boolean, never, R>) =>
  Effect.gen(function* () {
    const waitForAsyncWork = MemoizedAiService.isGenerationEnabled()
      ? Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 250)))
      : Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
    for (let step = 0; step < 240; step++) {
      if (yield* predicate) {
        return;
      }
      yield* TestClock.adjust(Duration.millis(50));
      yield* waitForAsyncWork;
    }
    return yield* Effect.dieMessage('driveUntil: condition not reached');
  });
