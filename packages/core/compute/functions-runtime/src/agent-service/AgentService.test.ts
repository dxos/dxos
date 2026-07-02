//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Clock from 'effect/Clock';
import * as DateTime from 'effect/DateTime';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import { expect } from 'vitest';

import { MemoizedAiService } from '@dxos/ai/testing';
import { PartialBlock, SessionLink } from '@dxos/assistant';
import { Operation, OperationHandlerSet, Process, ServiceResolver, Skill, Trace } from '@dxos/compute';
import { getSession, hydrate } from '@dxos/compute/AgentService';
import { Annotation, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Message, Organization } from '@dxos/types';

import { ProcessManager } from '../index';
import * as ResearchService from '../testing/ResearchService';
import { AGENT_PROCESS_KEY } from './agent-process';
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

const ResearchSkill = Skill.make({
  key: 'org.dxos.skill.research',
  name: 'Research',
  tools: Skill.toolDefinitions({ operations: [Research] }),
});

const assistantTestLayerOptions = {
  types: [Organization.Organization, Feed.Feed, Skill.Skill],
  tracing: 'pretty' as const,
  aiServicePreset: 'edge-remote' as const,
  operationHandlers: [handlers],
  skills: [ResearchSkill],
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

        const messages = yield* Feed.query(agent.feed, Filter.type(Message.Message)).run;
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
          skills: [ResearchSkill],
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
          skills: [ResearchSkill],
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
          skills: [ResearchSkill],
        });
        yield* agent.submitPrompt(`Research ${JSON.stringify(ResearchService.getTestData().organizations[0])}`);

        const researchService = yield* ServiceResolver.resolve(ResearchService.ResearchService, {});
        yield* researchService.waitForTaskToAppear();

        const processManager = yield* ProcessManager.ProcessManagerService;
        yield* processManager.shutdown();
        yield* processManager.startup();
        yield* hydrate();

        // Hydrate returns immediately; redelivery re-issues the research tool on a fresh child.
        // Drain all queued tasks (orphaned pre-restart + live child).
        yield* researchService.waitForTaskToAppear();
        yield* researchService.completeAllTasks();

        agent = yield* getSession(agent.feed);
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
          skills: [ResearchSkill],
        });
        yield* agent.submitPrompt(`Research ${JSON.stringify(ResearchService.getTestData().organizations[0])}`);

        const researchService = yield* ServiceResolver.resolve(ResearchService.ResearchService, {});
        yield* researchService.waitForTaskToAppear();
        yield* researchService.completeOneTask();

        const processManager = yield* ProcessManager.ProcessManagerService;
        yield* processManager.shutdown();
        yield* processManager.startup();
        yield* hydrate();

        // Redelivery may re-issue tools from the interrupted turn.
        yield* researchService.waitForTaskToAppear();
        yield* researchService.completeAllTasks();

        agent = yield* getSession(agent.feed);
        yield* agent.waitForCompletion();

        const messages = yield* Feed.query(agent.feed, Filter.type(Message.Message)).run;
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
        yield* hydrate();

        // The rehydrated agent is bound to the same feed, so a follow-up that only makes sense
        // with prior context resolves against the pre-restart turn.
        agent = yield* getSession(agent.feed);
        yield* agent.submitPrompt('What country did I just ask you about? Reply with just the country name.');
        yield* agent.waitForCompletion();

        const messages = yield* Feed.query(agent.feed, Filter.type(Message.Message)).run;
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
        yield* hydrate();
        yield* hydrate();
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
          skills: [ResearchSkill],
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

  // The agent's self-wake (set-alarm/get-current-date) flow lives with the alarm blueprint that now
  // provides those tools: `assistant-toolkit/src/skills/alarm/blueprint.test.ts`.

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
        const sourceMessages = (yield* Feed.query(source.feed, Filter.type(Message.Message)).run).filter(
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

        const forkText = (yield* Feed.query(fork.feed, Filter.type(Message.Message)).run)
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

  // Placed last (like the fork test) so it does not perturb the shared deterministic ID stream of
  // the memoized tests above.
  it.scoped(
    'agent process succeeds when idle and respawns for a follow-up turn',
    Effect.fnUntraced(
      function* (_) {
        const processManager = yield* ProcessManager.ProcessManagerService;

        const agent = yield* AgentService.createSession();
        const target = Obj.getURI(agent.feed);

        yield* agent.submitPrompt('What is the capital of France? Reply with just the city name.');
        yield* agent.waitForCompletion();

        // With no queued work, alarms, delegations, or undelivered tool results, the process calls
        // `ctx.succeed()` (see `maybeComplete` / `isAgentWorkPending`) and reaches a terminal state
        // instead of idling.
        const [firstHandle] = yield* processManager.list({ target, key: AGENT_PROCESS_KEY });
        const firstPid = String(firstHandle.pid);
        yield* Effect.promise(async () => {
          await expect.poll(() => firstHandle.status.state, { timeout: 5_000 }).toBe(Process.State.SUCCEEDED);
        });

        // A follow-up turn does not reuse the succeeded process: `getSession` skips terminal handles
        // and spawns a fresh one, which replays conversation history from the feed.
        const followUp = yield* getSession(agent.feed);
        yield* followUp.submitPrompt('What country did I just ask you about? Reply with just the country name.');
        yield* followUp.waitForCompletion();

        const processes = yield* processManager.list({ target, key: AGENT_PROCESS_KEY });
        expect(processes.some((process) => String(process.pid) !== firstPid)).toBe(true);

        const messages = yield* Feed.query(agent.feed, Filter.type(Message.Message)).run;
        const text = messages.map(Message.extractText).join('\n');
        expect(text.toLocaleLowerCase()).toContain('france');
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 60_000 : undefined },
  );

  // Drives the process control plane directly (no LLM turn), so it is placed after the memoized
  // tests above to avoid perturbing their shared deterministic ID stream.
  it.scoped(
    'setAlarm over the process control surface reaches the live agent and arms a self-wake',
    Effect.fnUntraced(
      function* (_) {
        const processManager = yield* ProcessManager.ProcessManagerService;

        // createSession spawns the agent process (no LLM turn yet) bound to a stamped host marker.
        const agent = yield* AgentService.createSession();
        const target = Obj.getURI(agent.feed);
        const [handle] = yield* processManager.list({ target, key: AGENT_PROCESS_KEY });

        // The spawn stamped the harness-host annotation so the process is discoverable as the owner.
        expect(
          Option.getOrNull(Annotation.getDictionary(handle.params.annotations, Process.HarnessHostAnnotation)),
        ).toBe(true);

        // A Tier-B caller reaches the live AlarmManager over the process RPC loopback. The handler
        // runs on the host's server fiber against the real closed-over AlarmManager; a successful
        // void result proves the control-plane wiring end-to-end (persistence semantics are covered
        // by the AlarmManager unit tests).
        const now = yield* Clock.currentTimeMillis;
        const at = DateTime.unsafeMake(now + Duration.toMillis(Duration.hours(1)));
        yield* handle.rpc.setAlarm({ at, message: 'finish the report' });

        // The RPC did not fail the process; it remains live and ready for the conversation to resume.
        expect(handle.status.state).not.toBe(Process.State.FAILED);
        expect(handle.status.state).not.toBe(Process.State.TERMINATED);

        yield* handle.terminate();
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
  );
});
