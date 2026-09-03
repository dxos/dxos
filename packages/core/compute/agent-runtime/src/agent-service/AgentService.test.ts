//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Clock from 'effect/Clock';
import * as DateTime from 'effect/DateTime';
import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as Tracer from 'effect/Tracer';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { expect } from 'vitest';

import { LanguageModelFixture } from '@dxos/ai/testing';
import { type HarnessControlRpcs, PartialBlock, SessionLink } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import { ProcessManager } from '@dxos/compute-runtime';
import { getSession, hydrate } from '@dxos/compute/AgentService';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Skill from '@dxos/compute/Skill';
import * as Trace from '@dxos/compute/Trace';
import { Annotation, Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { makeRecordingTracer } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';
import { ContentBlock, Message, Organization } from '@dxos/types';

import { AssistantTestLayer, waitForMessage } from '../testing/index.ts';
import * as ResearchService from '../testing/ResearchService.ts';
import { AGENT_PROCESS_KEY } from './agent-process.ts';
import * as AgentService from './AgentService.ts';
import { type DelegationStrategy } from './delegation-strategy.ts';

EntityId.dangerouslyDisableRandomness();

const Research = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.research'),
    name: 'Research',
    description: 'Research an organization',
  },
  input: Schema.Struct({
    website: Schema.String.annotate({ description: 'The website of the organization to research' }),
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
    key: DXN.make('com.example.operation.delegatedWork'),
    name: 'Delegated work',
    description: 'Performs a delegated unit of work',
  },
  input: Schema.String,
  output: Schema.String,
});

/**
 * A no-input operation, whose `Schema.Void` input is the case that survives in-process but not the
 * registry round trip: `Operation.serialize` renders it as `{type: 'null'}` and `deserialize` reads
 * it back as `Schema.Null`, so the tool projection sees a tag the authored operation never had.
 */
const Ping = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.ping'),
    name: 'Ping',
    description: 'Pings the service and returns its status. Takes no arguments.',
  },
  input: Schema.Void,
  output: Schema.String,
});

/** Set by {@link Ping}'s handler so a test can assert the model actually reached the tool. */
let pingCount = 0;

/**
 * A tool that does not unwind on interrupt. Terminating while it runs leaves the process scope
 * pinned open, which is the mid-turn cancel that produced the wedged-chat bug: teardown blocks, and
 * anything reading the handle's state meanwhile decides whether the next prompt reaches a process.
 */
const Stall = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.stall'),
    name: 'Stall',
    description: 'Runs a long job and returns when it finishes. Takes no arguments.',
  },
  input: Schema.Void,
  output: Schema.String,
});

/** Resolved by the test to let the stalled tool — and with it the blocked teardown — finish. */
let stallRelease: Deferred.Deferred<void> | undefined;
/** Fulfilled once the tool is actually running, so the test stops at the right moment. */
let stallStarted: Deferred.Deferred<void> | undefined;

const handlers = OperationHandlerSet.make(
  Ping.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* () {
        pingCount++;
        return 'pong';
      }),
    ),
  ),
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
  Stall.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* () {
        yield* Deferred.succeed(stallStarted!, undefined);
        yield* Deferred.await(stallRelease!).pipe(Effect.uninterruptible);
        return 'finished';
      }),
    ),
  ),
);

const ResearchSkill = Skill.make({
  key: 'org.dxos.skill.research',
  name: 'Research',
  tools: Skill.toolDefinitions({ operations: [Research] }),
});

const PingSkill = Skill.make({
  key: 'org.dxos.skill.ping',
  name: 'Ping',
  tools: Skill.toolDefinitions({ operations: [Ping] }),
});

const StallSkill = Skill.make({
  key: 'org.dxos.skill.stall',
  name: 'Stall',
  tools: Skill.toolDefinitions({ operations: [Stall] }),
});

const assistantTestLayerOptions = {
  types: [Organization.Organization, Feed.Feed, Skill.Skill, Instructions.Instructions, Text.Text],
  tracing: 'pretty' as const,
  aiServicePreset: 'edge-remote' as const,
  operationHandlers: [handlers],
  skills: [ResearchSkill, PingSkill],
  extraServices: ResearchService.layer,
};

const TestLayer = ({ enableToolBackgrounding = false }: { enableToolBackgrounding?: boolean } = {}) =>
  AssistantTestLayer({
    ...assistantTestLayerOptions,
    agent: { enableToolBackgrounding },
  });

// Separate layer so the extra registry seed lands after every other fixture test's ids: the module
// PRNG is shared file-wide, and reseeding earlier would invalidate their recorded conversations.
const StallTestLayer = AssistantTestLayer({
  ...assistantTestLayerOptions,
  skills: [...assistantTestLayerOptions.skills, StallSkill],
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
  reconcile: (_chat, activeIds) =>
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
  onComplete: (_chat, id, exit) =>
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

const turnSpans: Tracer.Span[] = [];

describe('Agent Service', { tags: ['model-fixture'] }, () => {
  it.effect(
    'can answer a question',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession();
        yield* session.submitPrompt('What is the capital of France?');
        yield* session.waitForCompletion();

        const messages = yield* Feed.query(session.feed, Filter.type(Message.Message)).run;
        const text = messages.map(Message.extractText).join('\n');
        expect(text.toLocaleLowerCase()).toContain('paris');
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 60_000 : undefined },
  );

  it.effect(
    'tool call',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession({ skills: [ResearchSkill] });
        yield* session.submitPrompt(`Research ${JSON.stringify(ResearchService.getTestData().organizations[0])}`);

        const researchService = yield* ServiceResolver.resolve(ResearchService.ResearchService, {});
        yield* researchService.waitForTaskToAppear();
        yield* researchService.completeOneTask();
        yield* session.waitForCompletion();
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 60_000 : undefined },
  );

  it.effect(
    'can be stopped while waiting for a tool call',
    Effect.fnUntraced(
      function* (_) {
        let session = yield* AgentService.createSession({ skills: [ResearchSkill] });
        yield* session.submitPrompt(`Research ${JSON.stringify(ResearchService.getTestData().organizations[0])}`);
        const researchService = yield* ServiceResolver.resolve(ResearchService.ResearchService, {});
        yield* researchService.waitForTaskToAppear();

        yield* session.terminate();
        expect(researchService.getTasks().map((task) => task.state)).toEqual(['interrupted']);
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'restart during tool call',
    Effect.fnUntraced(
      function* (_) {
        let session = yield* AgentService.createSession({ skills: [ResearchSkill] });
        yield* session.submitPrompt(`Research ${JSON.stringify(ResearchService.getTestData().organizations[0])}`);

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

        session = yield* getSession(session.chat);
        yield* session.waitForCompletion();
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 60_000 : undefined },
  );

  it.effect(
    'recovers queued tool results after reload',
    Effect.fnUntraced(
      function* (_) {
        let session = yield* AgentService.createSession({ skills: [ResearchSkill] });
        yield* session.submitPrompt(`Research ${JSON.stringify(ResearchService.getTestData().organizations[0])}`);

        const researchService = yield* ServiceResolver.resolve(ResearchService.ResearchService, {});
        yield* researchService.waitForTaskToAppear();
        yield* researchService.completeOneTask();
        // Settle the turn before tearing down, so what survives the reload is the queued tool result
        // alone. Without this the prompt's queue entry may also still be unacked, and recovery
        // delivers the result AND redelivers the prompt — which re-issues the tool this test is
        // asserting does not run twice.
        yield* session.waitForCompletion();

        const processManager = yield* ProcessManager.ProcessManagerService;
        yield* processManager.shutdown();
        yield* processManager.startup();
        yield* hydrate();

        session = yield* getSession(session.chat);
        yield* session.waitForCompletion();

        // Recovery replays an already-queued result as a synthetic `<result pid=N>` block rather than
        // re-issuing the tool, so the research must not run a second time — a re-issue would duplicate
        // the side effects of an operation that had already completed.
        expect(researchService.getTasks().map((task) => task.state)).toEqual(['completed']);
        session = yield* getSession(session.chat);

        // The recovery turn begins when the rehydrated process fires its alarm, which is after
        // `waitForCompletion` settles (that only covers the turn in flight), so poll the feed for the
        // reply instead. Asserting on the ASSISTANT's text and on a fact only the tool result carries:
        // the prompt itself says "Cyberdyne", so matching that over every message would pass even when
        // the recovered result never reached the model.
        const recovered = yield* waitForMessage(
          session.feed,
          (message) =>
            message.sender.role === 'assistant' && Message.extractText(message).toLocaleLowerCase().includes('nasdaq'),
          { timeout: LanguageModelFixture.isUpdateEnabled() ? 60_000 : 15_000 },
        );
        expect(Message.extractText(recovered).toLocaleLowerCase()).toContain('nasdaq');
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 120_000 : 30_000 },
  );

  it.effect(
    'rehydrates an idle session and replays conversation history',
    Effect.fnUntraced(
      function* (_) {
        let session = yield* AgentService.createSession();
        yield* session.submitPrompt('What is the capital of France? Reply with just the city name.');
        yield* session.waitForCompletion();

        // Simulate app teardown + reboot while the session sits idle (nothing in-flight).
        const processManager = yield* ProcessManager.ProcessManagerService;
        yield* processManager.shutdown();
        yield* processManager.startup();
        yield* hydrate();

        // The rehydrated agent is bound to the same feed, so a follow-up that only makes sense
        // with prior context resolves against the pre-restart turn.
        session = yield* getSession(session.chat);
        yield* session.submitPrompt('What country did I just ask you about? Reply with just the country name.');
        yield* session.waitForCompletion();

        const messages = yield* Feed.query(session.feed, Filter.type(Message.Message)).run;
        const text = messages.map(Message.extractText).join('\n');
        expect(text.toLocaleLowerCase()).toContain('paris');
        expect(text.toLocaleLowerCase()).toContain('france');
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 60_000 : undefined },
  );

  it.effect(
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

  it.effect(
    'runs AI agent with background tools via process manager',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession({ skills: [ResearchSkill] });

        const researchService = yield* ServiceResolver.resolve(ResearchService.ResearchService, {});
        const taskDrainer = yield* Effect.gen(function* () {
          yield* researchService.waitForTaskToAppear();
          yield* researchService.completeOneTask();
        }).pipe(Effect.forever, Effect.forkChild);

        let ephemeralEventCount = 0;
        const ephemeralFiber = yield* session.subscribeEphemeral().pipe(
          Stream.runForEach((msg) =>
            Effect.gen(function* () {
              for (const event of msg.events) {
                if (Trace.isOfType(PartialBlock, event)) {
                  ephemeralEventCount++;
                }
              }
            }),
          ),
          Effect.forkChild,
        );

        for (const org of ResearchService.getTestData().organizations) {
          yield* session.submitPrompt(JSON.stringify(org));
        }
        yield* session.submitPrompt('When all research is complete, print 1-sentence summary for each organization.');
        // TODO(dmaretskyi): wait until settles and only now start draining
        yield* session.waitForCompletion();

        yield* Fiber.interrupt(taskDrainer);
        yield* Fiber.interrupt(ephemeralFiber);

        expect(ephemeralEventCount).toBeGreaterThan(0);
      },
      Effect.provide(TestLayer({ enableToolBackgrounding: true })),
      TestHelpers.provideTestContext,
    ),
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 120_000 : undefined },
  );

  // Superseded by the ungated scripted-model port in `delegation-scripted.test.ts` (and the
  // real-strategy test in `assistant-toolkit/src/supervisor/delegation-strategy.test.ts`); kept
  // in place until this file's memoized fixtures are next regenerated, since removing it would
  // shift the shared deterministic ID stream the later fixtures depend on.
  describe('delegation (stub)', () => {
    it.effect(
      'delegates work to a sub-agent and folds the result back on completion',
      Effect.fnUntraced(
        function* (_) {
          delegationHarness.pending = [{ id: 'task-1', input: 'forty-two' }];
          delegationHarness.completed = [];

          const session = yield* AgentService.createSession();
          yield* session.submitPrompt('What is the capital of France?');
          // Settles on the turn's reply; the delegated child runs in the background (not awaited here).
          yield* session.waitForCompletion();

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
      { timeout: LanguageModelFixture.isUpdateEnabled() ? 60_000 : undefined },
    );
  });

  // The agent's self-wake (set-alarm/get-current-date) flow lives with the alarm blueprint that now
  // provides those tools: `assistant-toolkit/src/skills/alarm/blueprint.test.ts`.

  // Placed last so it does not perturb the shared deterministic ID stream of the tests above
  // (memoized conversations are keyed per file and depend on prior execution order).
  it.effect(
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
          return yield* Effect.die(new Error('source conversation produced no messages'));
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
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 60_000 : undefined },
  );

  // Placed last (like the fork test) so it does not perturb the shared deterministic ID stream of
  // the memoized tests above.
  it.effect(
    'agent process succeeds when idle and respawns for a follow-up turn',
    Effect.fnUntraced(
      function* (_) {
        const processManager = yield* ProcessManager.ProcessManagerService;

        const session = yield* AgentService.createSession();
        const target = Obj.getURI(session.chat);

        yield* session.submitPrompt('What is the capital of France? Reply with just the city name.');
        yield* session.waitForCompletion();

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
        const followUp = yield* getSession(session.chat);
        yield* followUp.submitPrompt('What country did I just ask you about? Reply with just the country name.');
        yield* followUp.waitForCompletion();

        const processes = yield* processManager.list({ target, key: AGENT_PROCESS_KEY });
        expect(processes.some((process) => String(process.pid) !== firstPid)).toBe(true);

        const messages = yield* Feed.query(session.feed, Filter.type(Message.Message)).run;
        const text = messages.map(Message.extractText).join('\n');
        expect(text.toLocaleLowerCase()).toContain('france');
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 60_000 : undefined },
  );

  // Drives the process control plane directly (no LLM turn), so it is placed after the memoized
  // tests above to avoid perturbing their shared deterministic ID stream.
  it.effect(
    'setAlarm over the process control surface reaches the live agent and arms a self-wake',
    Effect.fnUntraced(
      function* (_) {
        const processManager = yield* ProcessManager.ProcessManagerService;

        // Spawns the agent process (no LLM turn yet) bound to a stamped host marker.
        const session = yield* AgentService.createSession();
        const target = Obj.getURI(session.chat);
        // `list` erases the RPC group to `any`, which Effect 4 resolves to an `unknown` requirement
        // on every call; naming the group restores it.
        const handles: readonly ProcessManager.Handle<
          string | readonly ContentBlock.Any[],
          void,
          HarnessControlRpcs
        >[] = yield* processManager.list({
          target,
          key: AGENT_PROCESS_KEY,
        });
        const [handle] = handles;

        // The spawn stamped the harness-host annotation so the process is discoverable as the owner.
        expect(
          Option.getOrNull(Annotation.getDictionary(handle.params.annotations, Process.HarnessHostAnnotation)),
        ).toBe(true);

        // A Tier-B caller reaches the live host over the process RPC loopback. The handler runs on
        // the host's server fiber and appends an Alarm record to the feed; a successful void result
        // proves the control-plane wiring end-to-end (persistence semantics are covered by the
        // SessionStore tests).
        const now = yield* Clock.currentTimeMillis;
        const at = DateTime.makeUnsafe(now + Duration.toMillis(Duration.hours(1)));
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

  it.effect(
    'calls a tool whose operation takes no input',
    Effect.fnUntraced(
      function* (_) {
        pingCount = 0;
        const session = yield* AgentService.createSession({ skills: [PingSkill] });
        yield* session.submitPrompt('Ping the service and tell me what it returned.');
        yield* session.waitForCompletion();

        expect(pingCount).toBe(1);
        const messages = yield* Feed.query(session.feed, Filter.type(Message.Message)).run;
        expect(messages.map(Message.extractText).join('\n').toLocaleLowerCase()).toContain('pong');
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 60_000 : undefined },
  );

  // Stopping mid-tool-call finishes the handle while its teardown is still blocked on the in-flight
  // turn. A handle left readable as live is adopted by the next session, whose prompt is then dropped
  // by the `#finished` guard — the conversation wedges with no error until the page reloads. Uses a
  // tool that ignores interruption, since a tool that unwinds lets teardown complete and never
  // produces the stranded handle. The runtime seam is covered in ProcessManager.test.ts.
  it.effect(
    'accepts a new prompt after being stopped mid-tool-call',
    Effect.fnUntraced(
      function* (_) {
        stallStarted = yield* Deferred.make<void>();
        stallRelease = yield* Deferred.make<void>();

        const session = yield* AgentService.createSession({ skills: [StallSkill] });
        const processManager = yield* ProcessManager.ProcessManagerService;
        const [handle] = yield* processManager.list({ target: Obj.getURI(session.chat), key: AGENT_PROCESS_KEY });

        yield* session.submitPrompt('Run the stall tool.');
        yield* Deferred.await(stallStarted);

        // The stop button returns at once; `terminate` does not, because the tool holds the scope
        // open. Forking is what the UI effectively does — and what leaves the handle observable
        // mid-teardown. `terminate` publishes the state before its first yield, so one turn is enough.
        const stopping = yield* Effect.forkChild(session.terminate());
        yield* Effect.yieldNow;
        expect(handle.status.state).not.toBe(Process.State.RUNNING);

        // Same feed: the user typing again after hitting stop. The stopped handle must not be
        // adopted — neither from the session cache nor by the remount lookup that follows it.
        const resumed = yield* getSession(session.chat);
        expect(resumed).not.toBe(session);

        yield* resumed.submitPrompt('What is the capital of France? Reply with just the city name.');
        yield* resumed.waitForCompletion();
        const messages = yield* Feed.query(resumed.feed, Filter.type(Message.Message)).run;
        expect(messages.map(Message.extractText).join('\n').toLocaleLowerCase()).toContain('paris');

        // Let the stalled tool finish so the blocked teardown can complete with the test.
        yield* Deferred.succeed(stallRelease, undefined);
        yield* Fiber.join(stopping);
      },
      Effect.provide(StallTestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 60_000 : 30_000 },
  );
});

// Control-plane coverage (no LLM turn), so it runs ungated in CI unlike the replay suite above.
describe('Agent Service (control plane)', () => {
  it.effect(
    'concurrent cold-cache resolution spawns a single process',
    Effect.fnUntraced(
      function* ({ expect }) {
        const processManager = yield* ProcessManager.ProcessManagerService;
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        yield* Database.flush();

        // Both callers start before either writes the session cache, which is what serializing the
        // cache-miss path exists for: unserialized, each would spawn its own process for the chat.
        const [first, second] = yield* Effect.all([getSession(chat), getSession(chat)], {
          concurrency: 'unbounded',
        });
        expect(second).toBe(first);

        const processes = yield* processManager.list({ target: Obj.getURI(chat), key: AGENT_PROCESS_KEY });
        expect(processes).toHaveLength(1);

        yield* first.terminate();
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reports whether the session is working on a turn',
    Effect.fnUntraced(
      function* (_) {
        const registry = yield* Registry.AtomRegistry;
        const processManager = yield* ProcessManager.ProcessManagerService;
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        yield* Database.flush();
        const target = Obj.getURI(chat);

        const session = yield* getSession(chat);
        const [handle] = yield* processManager.list({ target, key: AGENT_PROCESS_KEY });

        // Spawned but not prompted: live, awaiting input, so not working on a turn.
        expect(handle.status.state).toBe(Process.State.IDLE);
        expect(registry.get(session.running)).toBe(false);

        // Derived from the process's status atom, not fixed at the time the session was resolved.
        const observed: boolean[] = [];
        const unsubscribe = registry.subscribe(session.running, (running) => observed.push(running), {
          immediate: true,
        });
        yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()));
        yield* handle.terminate();
        expect(registry.get(session.running)).toBe(false);
        expect(observed).toEqual([false]);
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'rediscovers a persisted agent whose hydration was skipped',
    Effect.fnUntraced(
      function* (_) {
        const processManager = yield* ProcessManager.ProcessManagerService;
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        yield* Database.flush();
        const target = Obj.getURI(chat);

        const spawned = yield* getSession(chat);
        const [before] = yield* processManager.list({ target, key: AGENT_PROCESS_KEY });

        // Reboot without hydrating: the record survives but no live handle does, so `list` yields
        // a read-only dormant view. A service whose session cache does not carry over (boot-time
        // hydration cleared it, or skipped this agent) rediscovers the process through that view
        // and must adopt what `hydrate` returns — adopting the dormant view itself leaves every
        // call on the session dying with "Process not hydrated".
        yield* processManager.shutdown();
        yield* processManager.startup();

        const session = yield* getSession(chat).pipe(Effect.provide(AgentService.layer()));
        expect(session).not.toBe(spawned);
        const [after] = yield* processManager.list({ target, key: AGENT_PROCESS_KEY });
        expect(String(after.pid)).toBe(String(before.pid));

        // Exercises the live surface the dormant handle lacks, without needing a model turn.
        yield* session.waitForCompletion();
        yield* after.terminate();
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
  );

  // Exercises the instruction-aware reuse identity on both paths — the session cache and the
  // remount (rediscovered process) path. The steering ref lives on the chat, so repointing the
  // chat is what makes the running process stale.
  it.effect(
    'session reuse tracks the chat steering-instructions ref',
    Effect.fnUntraced(
      function* (_) {
        const processManager = yield* ProcessManager.ProcessManagerService;

        const instructionsA = yield* Database.add(Instructions.make({ text: 'Steering A.' }));
        const instructionsB = yield* Database.add(Instructions.make({ text: 'Steering B.' }));
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), instructions: Ref.make(instructionsA) }));
        yield* Database.flush();
        const target = Obj.getURI(chat);

        const isActive = (state: Process.State) =>
          state !== Process.State.SUCCEEDED && state !== Process.State.FAILED && state !== Process.State.TERMINATED;
        const activePids = Effect.gen(function* () {
          const processes = yield* processManager.list({ target, key: AGENT_PROCESS_KEY });
          return processes.filter((process) => isActive(process.status.state));
        });

        // Spawned against the chat, so the process's target is the chat itself.
        const sessionA = yield* getSession(chat);
        const [handleA] = yield* activePids;
        const pidA = String(handleA.pid);

        // Unchanged ref: the cached session (and process) is reused.
        const sessionAgain = yield* getSession(chat);
        expect(sessionAgain).toBe(sessionA);
        expect((yield* activePids).map((handle) => String(handle.pid))).toEqual([pidA]);

        // Repointed ref: the process is torn down and respawned so it reads the new steering.
        Obj.update(chat, (chat) => {
          chat.instructions = Ref.make(instructionsB);
        });
        yield* Database.flush();
        yield* getSession(chat);
        const [handleB] = yield* activePids;
        expect(String(handleB.pid)).not.toBe(pidA);

        // Remount path (cache cleared by hydrate): the rediscovered process is reused, since it is
        // bound to the same chat.
        yield* hydrate();
        const resumed = yield* getSession(chat);
        expect((yield* activePids).map((handle) => String(handle.pid))).toEqual([String(handleB.pid)]);

        yield* resumed.terminate();
      },
      Effect.provide(TestLayer()),
      TestHelpers.provideTestContext,
    ),
  );
  it.effect(
    'traces a turn run through the agent process',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession();
        yield* session.submitPrompt('What is the capital of France?');
        yield* session.waitForCompletion();

        expect(turnSpans.map(({ name }) => name)).toContain('AiSession.createRequest');

        const turn = turnSpans.find((span) => span.name === 'AiSession.createRequest');
        expect(turn?.attributes.get('dxos.ai.kind')).toEqual('turn');
        expect(String(turn?.attributes.get('dxos.ai.input'))).toContain('capital of France');
        expect(JSON.parse(String(turn?.attributes.get('dxos.ai.output')))).toEqual(
          expect.arrayContaining([expect.objectContaining({ role: 'assistant' })]),
        );
      },
      Effect.provide(TestLayer()),
      Effect.provide(Layer.succeed(Tracer.Tracer, makeRecordingTracer(turnSpans))),
      TestHelpers.provideTestContext,
    ),
    { timeout: LanguageModelFixture.isUpdateEnabled() ? 60_000 : undefined },
  );
});
