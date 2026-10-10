//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as AiError from 'effect/ai/AiError';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiSession } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN } from '@dxos/keys';
import { Message } from '@dxos/types';

import { ChatModel } from './chat-model.ts';
import { ChatModelRecorder } from './testing/chat-model-recorder.ts';
import { makeSpaceLayer, makeTestRuntime } from './testing/harness.ts';

const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;

/**
 * The chat model end to end against the real agent process and a scripted model: every indicator the UI
 * binds to is recorded as an event log, and the log is asserted on rather than the end state alone, so a
 * flicker, a missing phase, or a turn that reads idle while the agent works is a test failure.
 */

//
// Gate: a tool the test holds open, so a turn can be observed (and interrupted) mid-flight.
//

const Gate = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.chatModelGate'),
    name: 'Gate',
    description: 'Runs until the test releases it.',
  },
  input: Schema.Struct({ label: Schema.String.annotate({ description: 'Label echoed back' }) }),
  output: Schema.String,
});

/** Per-test gate state; the handler is module-level, so the test installs a fresh gate before each run. */
let gate: { started: Deferred.Deferred<void>; release: Deferred.Deferred<void> } | undefined;

const makeGate = Effect.gen(function* () {
  const next = { started: yield* Deferred.make<void>(), release: yield* Deferred.make<void>() };
  gate = next;
  return next;
});

const GateHandlers = OperationHandlerSet.make(
  Gate.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ label }) {
        const current = gate;
        if (!current) {
          return yield* Effect.die(new Error('Gate not installed.'));
        }
        yield* Deferred.succeed(current.started, undefined);
        yield* Deferred.await(current.release);
        return `${label}: released`;
      }),
    ),
  ),
);

const GateSkill = Skill.make({
  key: 'org.dxos.skill.chatModelGate',
  name: 'Gate',
  tools: Skill.toolDefinitions({ operations: [Gate] }),
});

const gateCall = { parts: [toolCall(Operation.toolName(Gate), { label: 'gate' })] };

const testLayer = (script: ScriptedLanguageModel.Script) =>
  AssistantTestLayer({
    types: [Chat.Chat, Feed.Feed, Message.Message],
    operationHandlers: [GateHandlers],
    skills: [GateSkill],
    aiService: scriptedAiService(script),
  });

/** A provider rejection the agent does not retry, carrying the text the chat should surface. */
const providerFailure = (description: string) => ({
  fail: new AiError.AiError({
    module: 'ScriptedLanguageModel',
    method: 'streamText',
    reason: new AiError.InvalidRequestError({ description }),
  }),
});

/**
 * A chat model over the test layer's real agent service, with a recorder attached before anything runs.
 * The chat is named so the first prompt does not schedule a rename, which would draw on the script.
 */
const setup = Effect.fn(function* ({ skills = [] }: { skills?: Skill.Skill[] } = {}) {
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ name: 'Test', feed: Ref.make(feed) }));
  const runtime = yield* Effect.context<Database.Service>();
  const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));
  if (skills.length > 0) {
    yield* Effect.promise(() => session.context.bind({ skills: skills.map(Skill.makeRef), objects: [] }));
  }

  // The UI reads the app-wide registry, which is also where the agent process writes its status.
  const registry = yield* AtomRegistry.AtomRegistry;
  const chatModel = new ChatModel(session, yield* makeTestRuntime, feed, yield* makeSpaceLayer, {
    chat: Ref.make(chat),
    observableRegistry: registry,
  });
  // Same options the chat model resolves with, so this is the session it drives rather than a rival.
  const agent = yield* AgentService.getSession(chat, { location: 'local' });
  const recorder = new ChatModelRecorder(registry, chatModel, { agentRunning: agent.running });
  yield* Effect.addFinalizer(() => Effect.sync(() => recorder.dispose()));
  return { chat, feed, chatModel, recorder };
});

const awaitPromise = <T>(promise: () => Promise<T>) => Effect.promise(promise);

/** The indicator log without the agent's own signal or the thread, which most assertions read apart. */
const INDICATORS = ['active', 'streaming', 'activity', 'error'] as const;

/** Collapses consecutive duplicates, so a phase repeated across steps reads once. */
const dedupe = (values: readonly string[]) => values.filter((value, index) => value !== values[index - 1]);

describe('ChatModel (scripted agent)', { timeout: 30_000 }, () => {
  it.live(
    'a text reply moves every indicator through one turn and back to idle',
    Effect.fn(
      function* ({ expect }) {
        const { chatModel, recorder } = yield* setup();
        chatModel.send({ message: 'Hello?' });
        yield* awaitPromise(() => recorder.untilSettled());

        expect(recorder.violations).toEqual([]);
        expect(recorder.values('active')).toEqual(['false', 'true', 'false']);
        expect(recorder.values('error')).toEqual(['-']);

        // `starting` is set locally before the process can report anything; the agent's own setup
        // phases follow, then content arriving moves the line to `generating` until the turn settles.
        const phases = recorder.values('activity');
        expect(phases[0]).toBe('-');
        expect(phases[1]).toBe('starting');
        expect(phases).toContain('contacting-provider');
        expect(phases.at(-2)).toBe('generating');
        expect(phases.at(-1)).toBe('-');

        // The reply streamed and was then committed: the thread ends as the prompt and its answer.
        expect(recorder.values('streaming')).toContain('true');
        expect(recorder.state.streaming).toBe('false');
        yield* awaitPromise(() =>
          recorder.until((state) => state.thread === 'user[read]:"Hello?" | assistant:"Hello world."'),
        );
      },
      Effect.provide(testLayer([{ delay: '50 millis', parts: [text('Hello world.')] }])),
      TestHelpers.provideTestContext,
    ),
  );

  it.live(
    'a prompt shows in the thread at once and is read before the reply lands',
    Effect.fn(
      function* ({ expect }) {
        const { chatModel, recorder } = yield* setup();
        chatModel.send({ message: 'Hello?' });
        // Same frame as the send: the row exists before anything was persisted or dispatched.
        expect(recorder.state.thread).toBe('user[sent]:"Hello?"');
        yield* awaitPromise(() => recorder.untilSettled());

        const statuses = dedupe(
          recorder.values('thread').flatMap((thread) => thread.match(/^user\[([a-z]+)\]/)?.[1] ?? []),
        );
        // The row is one row for its whole life, ticking from sent to read once the agent takes it up.
        expect(statuses[0]).toBe('sent');
        expect(statuses.at(-1)).toBe('read');
        expect(recorder.state.thread).toBe('user[read]:"Hello?" | assistant:"Hi."');
        expect(recorder.violations).toEqual([]);
      },
      Effect.provide(testLayer([{ delay: '50 millis', parts: [text('Hi.')] }])),
      TestHelpers.provideTestContext,
    ),
  );

  it.live(
    'a turn parked in a tool keeps every indicator up until the tool returns',
    Effect.fn(
      function* ({ expect }) {
        const { chatModel, recorder } = yield* setup({ skills: [GateSkill] });
        const { started, release } = yield* makeGate;
        chatModel.send({ message: 'Use the gate.' });
        yield* Deferred.await(started);

        // Nothing is streaming while the tool runs; the line names the tool, and the turn is still active.
        yield* awaitPromise(() => recorder.until((state) => state.activity.startsWith('calling-tool')));
        expect(recorder.state.active).toBe('true');
        expect(recorder.state.agent).toBe('running');

        yield* Deferred.succeed(release, undefined);
        yield* awaitPromise(() => recorder.untilSettled());

        expect(recorder.violations).toEqual([]);
        expect(recorder.values('active')).toEqual(['false', 'true', 'false']);
        const phases = dedupe(recorder.values('activity').map((phase) => phase.replace(/\(.*\)/, '')));
        expect(phases.indexOf('calling-tool')).toBeGreaterThan(phases.indexOf('starting'));
        // The model is contacted again with the tool's result before the turn ends.
        expect(phases.lastIndexOf('contacting-provider')).toBeGreaterThan(phases.indexOf('calling-tool'));
        expect(recorder.state.thread).toContain('assistant:"Gate released."');
      },
      Effect.provide(testLayer([gateCall, { parts: [text('Gate released.')] }])),
      TestHelpers.provideTestContext,
    ),
  );

  it.live(
    'cancelling mid-tool clears every indicator without reporting an error',
    Effect.fn(
      function* ({ expect }) {
        const { chatModel, recorder } = yield* setup({ skills: [GateSkill] });
        const { started } = yield* makeGate;
        chatModel.send({ message: 'Use the gate.' });
        yield* Deferred.await(started);
        yield* awaitPromise(() => recorder.until((state) => state.activity.startsWith('calling-tool')));

        yield* awaitPromise(() => chatModel.cancel());
        yield* awaitPromise(() => recorder.until((state) => state.agent !== 'running'));

        expect(recorder.state.active).toBe('false');
        expect(recorder.state.activity).toBe('-');
        expect(recorder.state.streaming).toBe('false');
        // A cancel is the reader's own doing, not a failure to report.
        expect(recorder.values('error')).toEqual(['-']);
        expect(recorder.violations).toEqual([]);
      },
      Effect.provide(testLayer([gateCall, { parts: [text('unreachable')] }])),
      TestHelpers.provideTestContext,
    ),
  );

  it.live(
    'a provider failure surfaces its message and clears the working indicators',
    Effect.fn(
      function* ({ expect }) {
        const { chatModel, recorder } = yield* setup();
        chatModel.send({ message: 'Hello?' });
        yield* awaitPromise(() => recorder.untilSettled());
        yield* awaitPromise(() => recorder.until((state) => state.error !== '-'));

        expect(recorder.state.error).toBe('Invalid request. model rejected the request');
        expect(recorder.state.active).toBe('false');
        expect(recorder.state.activity).toBe('-');
        expect(recorder.state.streaming).toBe('false');
        // The error is raised once the turn has ended, never while the turn still reads as working.
        expect(recorder.firstAt('error', (value) => value !== '-')).toBeGreaterThanOrEqual(
          recorder.firstAt('active', 'true') ?? 0,
        );
        expect(recorder.violations).toEqual([]);
      },
      Effect.provide(testLayer([providerFailure('model rejected the request')])),
      TestHelpers.provideTestContext,
    ),
  );

  it.live(
    'a retry after a failure clears the error and runs a fresh turn',
    Effect.fn(
      function* ({ expect }) {
        const { chatModel, recorder } = yield* setup();
        chatModel.send({ message: 'Hello?' });
        yield* awaitPromise(() => recorder.until((state) => state.error !== '-' && state.active === 'false'));

        yield* awaitPromise(() => chatModel.retry());
        yield* awaitPromise(() => recorder.until((state) => state.active === 'false' && state.error === '-'));

        expect(dedupe(recorder.values('active'))).toEqual(['false', 'true', 'false', 'true', 'false']);
        expect(recorder.values('error')).toEqual(['-', 'Invalid request. transient', '-']);
        expect(recorder.state.thread).toContain('assistant:"Recovered."');
        expect(recorder.violations).toEqual([]);
      },
      Effect.provide(testLayer([providerFailure('transient'), { parts: [text('Recovered.')] }])),
      TestHelpers.provideTestContext,
    ),
  );

  it.live(
    'a prompt sent mid-turn queues behind it and the chat stays active across both turns',
    Effect.fn(
      function* ({ expect }) {
        const { chatModel, recorder } = yield* setup({ skills: [GateSkill] });
        const { started, release } = yield* makeGate;
        chatModel.send({ message: 'First.' });
        yield* Deferred.await(started);

        chatModel.send({ message: 'Second.' });
        // Queued, not dispatched: the running turn is left alone.
        yield* awaitPromise(() => recorder.until((state) => /user\[[a-z]+\]:"Second\."/.test(state.thread)));
        expect(recorder.state.active).toBe('true');

        yield* Deferred.succeed(release, undefined);
        yield* awaitPromise(() => recorder.until((state) => state.active === 'false'));

        // One continuous active span: the queued turn runs inside the first request's wait.
        expect(recorder.values('active')).toEqual(['false', 'true', 'false']);
        expect(recorder.violations).toEqual([]);
        yield* awaitPromise(() =>
          recorder.until((state) => state.thread.endsWith('user[read]:"Second." | assistant:"Second answer."')),
        );
      },
      Effect.provide(testLayer([gateCall, { parts: [text('First answer.')] }, { parts: [text('Second answer.')] }])),
      TestHelpers.provideTestContext,
    ),
  );

  it.live(
    'consecutive prompts each run a full indicator cycle',
    Effect.fn(
      function* ({ expect }) {
        const { chatModel, recorder } = yield* setup();
        chatModel.send({ message: 'One?' });
        yield* awaitPromise(() => recorder.untilSettled());
        const firstCycle = recorder.events.length;

        chatModel.send({ message: 'Two?' });
        yield* awaitPromise(() =>
          recorder.until((state) => state.active === 'false' && state.thread.endsWith('assistant:"Two."')),
        );

        expect(recorder.values('active')).toEqual(['false', 'true', 'false', 'true', 'false']);
        const second = recorder.events.slice(firstCycle).filter((event) => event.signal === 'activity');
        expect(second[0]?.value).toBe('starting');
        expect(second.at(-1)?.value).toBe('-');
        expect(recorder.violations).toEqual([]);
      },
      Effect.provide(
        testLayer([
          { delay: '20 millis', parts: [text('One.')] },
          { delay: '20 millis', parts: [text('Two.')] },
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it.live(
    'a remounted chat adopts the turn in flight and shows it as working',
    Effect.fn(
      function* ({ expect }) {
        const { chat, feed, chatModel, recorder } = yield* setup({ skills: [GateSkill] });
        const { started, release } = yield* makeGate;
        chatModel.send({ message: 'Use the gate.' });
        yield* Deferred.await(started);

        // A second mount of the same chat: a fresh model that did not issue the turn.
        const runtime = yield* Effect.context<Database.Service>();
        const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));
        const registry = yield* AtomRegistry.AtomRegistry;
        const remounted = new ChatModel(session, yield* makeTestRuntime, feed, yield* makeSpaceLayer, {
          chat: Ref.make(chat),
          observableRegistry: registry,
        });
        const agent = yield* AgentService.getSession(chat, { location: 'local' });
        const adopted = new ChatModelRecorder(registry, remounted, { agentRunning: agent.running });
        const dispose = remounted.adopt();
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            dispose();
            adopted.dispose();
          }),
        );

        yield* awaitPromise(() => adopted.until((state) => state.active === 'true'));
        // Attaching is asynchronous, so the remounted model reads idle until it has found the session.
        const adoptedAt = adopted.firstAt('active', 'true') ?? 0;
        yield* Deferred.succeed(release, undefined);
        yield* awaitPromise(() => adopted.untilSettled());
        yield* awaitPromise(() => recorder.untilSettled());

        expect(adopted.violations.filter((violation) => violation.at > adoptedAt)).toEqual([]);
        expect(adopted.values('activity')).toContain('starting');
        expect(recorder.violations).toEqual([]);
      },
      Effect.provide(testLayer([gateCall, { parts: [text('Gate released.')] }])),
      TestHelpers.provideTestContext,
    ),
  );

  it.live(
    'the indicator log of a tool turn reads in order',
    Effect.fn(
      function* ({ expect }) {
        const { chatModel, recorder } = yield* setup({ skills: [GateSkill] });
        const { started, release } = yield* makeGate;
        chatModel.send({ message: 'Use the gate.' });
        yield* Deferred.await(started);
        yield* Deferred.succeed(release, undefined);
        yield* awaitPromise(() => recorder.untilSettled());

        expect(recorder.lines([...INDICATORS, 'agent'])).toEqual([
          'active=false',
          'streaming=false',
          'activity=-',
          'error=-',
          'agent=idle',
          // Set locally the moment the prompt is dispatched, before the process exists to say anything.
          'activity=starting',
          'active=true',
          'agent=running',
          'activity=preparing',
          'activity=loading-history',
          'activity=building-toolkit',
          'activity=encoding-prompt',
          'activity=contacting-provider',
          'activity=generating',
          'streaming=true',
          `activity=calling-tool(${Operation.toolName(Gate)})`,
          // The tool's result goes back to the model as a second request within the same turn.
          'activity=building-toolkit',
          'activity=encoding-prompt',
          'activity=contacting-provider',
          'activity=generating',
          // The agent settles first; the chat clears every indicator together once it has noticed.
          'agent=idle',
          'streaming=false',
          'active=false',
          'activity=-',
        ]);
      },
      Effect.provide(testLayer([gateCall, { parts: [text('Gate released.')] }])),
      TestHelpers.provideTestContext,
    ),
  );
});
