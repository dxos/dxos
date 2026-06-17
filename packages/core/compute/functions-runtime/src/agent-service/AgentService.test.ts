//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as TestClock from 'effect/TestClock';
import { expect } from 'vitest';

import { MemoizedAiService, MemoizedLanguageModel } from '@dxos/ai/testing';
import { PartialBlock, SessionLink } from '@dxos/assistant';
import { Blueprint, Operation, OperationHandlerSet, ServiceResolver, Trace } from '@dxos/compute';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Message, Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import { ProcessManager } from '../index';
import * as ResearchService from '../testing/ResearchService';
import * as AgentService from './AgentService';
import { type DelegationStrategy } from './delegation-strategy';

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

/**
 * Trivial child operation a {@link DelegationStrategy} can spawn as a sub-agent. Returns a derived
 * string synchronously so the delegation lifecycle can be exercised without an extra LLM turn.
 */
const DelegatedWork = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.delegatedWork'),
    name: 'Delegated work',
    description: 'Performs a delegated unit of work',
  },
  input: Schema.String,
  output: Schema.String,
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
  DelegatedWork.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        return `done: ${input}`;
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
    agent: { enableToolBackgrounding },
  });

//
// Delegation (supervisor) fixtures.
//

interface DelegationHarness {
  /** Work the stub strategy delegates on the next reconcile (keyed by a stable id). */
  pending: { id: string; input: string }[];
  /** Completions observed via the strategy's `onComplete` callback. */
  completed: { id: string; exit: Exit.Exit<unknown> }[];
}

const delegationHarness: DelegationHarness = { pending: [], completed: [] };

/**
 * Stub {@link DelegationStrategy} driven by {@link delegationHarness}: each reconcile delegates the
 * pending work not already in flight (spawning {@link DelegatedWork} as a linked child) and records
 * completions, so a test can assert the reconcile → spawn → onChildEvent → onComplete loop.
 */
const StubDelegationStrategy: DelegationStrategy = {
  reconcile: (_feed, activeIds) =>
    Effect.succeed(
      delegationHarness.pending
        .filter((work) => !activeIds.has(work.id))
        .map((work) => ({
          id: work.id,
          spawn: Effect.gen(function* () {
            const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
            const fiber = yield* invoker.invokeFiber(DelegatedWork, work.input);
            return fiber.pid;
          }),
        })),
    ),
  onComplete: (_feed, id, exit) =>
    Effect.sync(() => {
      delegationHarness.completed.push({ id, exit });
      // Drop the completed work so a later reconcile does not re-delegate it.
      delegationHarness.pending = delegationHarness.pending.filter((work) => work.id !== id);
    }),
};

const DelegationTestLayer = AssistantTestLayer({
  ...assistantTestLayerOptions,
  agent: { delegationStrategy: StubDelegationStrategy },
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

  // TODO(before merge): e2e coverage for agent ctx.succeed lifecycle — see agent-process.test.ts.
  it.todo('agent process succeeds when idle and respawns for a follow-up turn');

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

  describe('delegation (stub)', () => {
    it.scoped(
      'delegates work to a sub-agent and folds the result back on completion',
      Effect.fnUntraced(
        function* (_) {
          delegationHarness.pending = [{ id: 'task-1', input: 'forty-two' }];
          delegationHarness.completed = [];

          const agent = yield* AgentService.createSession();
          yield* agent.submitPrompt('What is the capital of France?');
          // Settles on the turn's reply; the delegated child runs in the background (not awaited here).
          yield* agent.waitForCompletion();

          // The post-turn reconcile spawned a linked child; its exit drives onChildEvent → onComplete.
          yield* Effect.promise(async () => {
            await expect.poll(() => delegationHarness.completed.length, { timeout: 5_000 }).toBe(1);
          });

          const [completion] = delegationHarness.completed;
          expect(completion.id).toBe('task-1');
          expect(Exit.isSuccess(completion.exit)).toBe(true);
          if (Exit.isSuccess(completion.exit)) {
            expect(completion.exit.value).toBe('done: forty-two');
          }
        },
        Effect.provide(DelegationTestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined },
    );
  });

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
    agent: { systemPrompt: ALARM_SYSTEM_PROMPT },
    aiServicePreset: 'edge-remote',
    model: 'ai.claude.model.claude-opus-4-6',
    // Alarm fire times are derived from the TestClock and vary between generation and replay runs
    // (the number of TestClock advances before the tool executes differs). Normalizing ISO timestamps
    // so any stored conversation matches regardless of the exact millisecond value.
    dynamicValuePatterns: [MemoizedLanguageModel.ISO_TIMESTAMP_PATTERN],
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

  // Placed last so it does not perturb the shared deterministic ID stream of the tests above
  // (memoized conversations are keyed per file and depend on prior execution order).
  it.scoped(
    'forks a conversation into a new feed and replays source history via a SessionLink',
    Effect.fnUntraced(
      function* (_) {
        // Original conversation.
        const source = yield* AgentService.createSession();
        yield* source.submitPrompt('What is the capital of France? Reply with just the city name.');
        yield* source.waitForCompletion();

        // Branch point: the last message of the source conversation.
        const sourceMessages = (yield* Feed.runQuery(source.feed, Filter.type(Message.Message))).filter(
          Obj.instanceOf(Message.Message),
        );
        const lastMessage = sourceMessages.sort((a, b) => a.created.localeCompare(b.created)).at(-1);
        if (!lastMessage) {
          return yield* Effect.dieMessage('source conversation produced no messages');
        }

        // Fork: a fresh session whose feed links back to the source via a SessionLink (mirrors the
        // ForkChat operation). The forked agent has no messages of its own, so a context-dependent
        // follow-up only resolves if the source history is replayed through the link.
        const fork = yield* AgentService.createSession();
        yield* Feed.append(fork.feed, [
          Obj.make(SessionLink.SessionLink, {
            feedRef: Ref.make(source.feed),
            messageId: lastMessage.id,
          }),
        ]);

        yield* fork.submitPrompt('What country did I just ask you about? Reply with just the country name.');
        yield* fork.waitForCompletion();

        const forkText = (yield* Feed.runQuery(fork.feed, Filter.type(Message.Message)))
          .filter(Obj.instanceOf(Message.Message))
          .map(Message.extractText)
          .join('\n');
        expect(forkText.toLocaleLowerCase()).toContain('france');
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined },
  );
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
