//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import * as Stream from 'effect/Stream';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiSession } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { TestHelpers } from '@dxos/effect/testing';
import { type ContentBlock, type Message } from '@dxos/types';

import { ChatModel } from './chat-model.ts';
import { makeStubSpaceLayer, makeTestRuntime } from './testing/harness.ts';

const TestLayer = AssistantTestLayer({ tracing: 'noop', types: [Chat.Chat, Feed.Feed] });

describe('ChatModel streaming', () => {
  it.effect(
    'upserts partials, finalizes complete blocks, ignores late partials, and flushes on completion',
    Effect.fn(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        // The chat model resolves its agent session from the chat it runs on.
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        const runtime = yield* Effect.context<Database.Service>();
        const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));

        // The scripted stream: a growing partial for m1, its finalization, a late (stale) partial
        // for m1, and an m2 partial that never finalizes (flushed when the request completes).
        const m1 = Obj.ID.random();
        const m2 = Obj.ID.random();
        const batches = [
          traceMessage([partialBlockEvent(m1, 'Hel', true)]),
          traceMessage([partialBlockEvent(m1, 'Hello', true)]),
          traceMessage([partialBlockEvent(m1, 'Hello world.', false)]),
          traceMessage([partialBlockEvent(m1, 'Hello world. (stale)', true)]),
          traceMessage([partialBlockEvent(m2, 'Working…', true)]),
        ];
        const stubSession = yield* makeStubSession(chat, feed, batches);
        const stubAgentService: AgentService.Service = {
          getSession: () => Effect.succeed(stubSession),
          hydrate: () => Effect.void,
        };
        const spaceLayer = yield* makeStubSpaceLayer(stubAgentService);

        const observableRegistry = AtomRegistry.make();
        const chatModelRuntime = yield* makeTestRuntime;
        const chatModel = new ChatModel(session, chatModelRuntime, feed, spaceLayer, {
          chat: Ref.make(chat),
          observableRegistry,
        });

        // Atoms only hold state while mounted (the UI mounts them via `useAtomValue`); subscribe
        // with `immediate` before the request — a lazy subscription does not mount the atom graph
        // until first read, so updates would be dropped — and collect snapshots so the in-flight
        // progression is observable too.
        const snapshots: string[][] = [];
        const unsubscribers = [
          observableRegistry.subscribe(
            chatModel.messages,
            (messages) =>
              snapshots.push(
                messages.map((message) => message.blocks.map((block) => (block as ContentBlock.Text).text).join('')),
              ),
            { immediate: true },
          ),
          observableRegistry.subscribe(chatModel.error, () => {}),
          observableRegistry.subscribe(chatModel.active, () => {}),
        ];
        yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribers.forEach((unsubscribe) => unsubscribe())));

        yield* Effect.promise(() => chatModel.request({ message: 'Hello?' }));

        // Surface any swallowed request failure before asserting on state.
        const error = observableRegistry.get(chatModel.error);
        expect(error._tag === 'Some' ? `${error.value.message}: ${error.value.cause}` : undefined).toBeUndefined();

        // m1 was finalized exactly once (the late partial after finalization is dropped); m2's
        // unfinalized partial was flushed into the pending list when the agent completed.
        const messages = observableRegistry.get(chatModel.messages);
        expect(messages.map(({ id }) => id)).toEqual([m1, m2]);
        expect(texts(messages)).toEqual(['Hello world.', 'Working…']);

        // The growing m1 partial was upserted in place (a single entry per snapshot), and the
        // stale partial that arrived after finalization never surfaced. Transient two-phase
        // artifacts (a brief [] on finalize, a brief duplicate on flush) are expected — the UI
        // masks them via `Chat.Root`'s dedupe-by-id merge.
        expect(snapshots).toContainEqual(['Hel']);
        expect(snapshots).toContainEqual(['Hello']);
        expect(snapshots.flat()).not.toContain('Hello world. (stale)');

        // The request settled cleanly: nothing left streaming, no error, inactive.
        expect(observableRegistry.get(chatModel.streaming)).toBe(false);
        expect(observableRegistry.get(chatModel.active)).toBe(false);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'adopts an agent still running after a remount, and ignores an idle one',
    Effect.fn(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        // The chat model resolves its agent session from the chat it runs on.
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        const runtime = yield* Effect.context<Database.Service>();
        const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));

        const messageId = Obj.ID.random();
        const batches = [
          traceMessage([partialBlockEvent(messageId, 'Still', true)]),
          traceMessage([partialBlockEvent(messageId, 'Still working…', false)]),
        ];

        const idleSession = yield* makeStubSession(chat, feed, batches, { running: false });
        const idleRegistry = AtomRegistry.make();
        const idleChatModel = new ChatModel(
          session,
          yield* makeTestRuntime,
          feed,
          yield* makeStubSpaceLayer({
            getSession: () => Effect.succeed(idleSession),
            hydrate: () => Effect.void,
          }),
          { chat: Ref.make(chat), observableRegistry: idleRegistry },
        );
        const idleUnsubscribers = [
          idleRegistry.subscribe(idleChatModel.messages, () => {}, { immediate: true }),
          idleChatModel.adopt(),
        ];
        yield* Effect.addFinalizer(() => Effect.sync(() => idleUnsubscribers.forEach((dispose) => dispose())));
        yield* quiesce;
        // A live-but-idle agent (awaiting input) is not adopted.
        expect(idleRegistry.get(idleChatModel.active)).toBe(false);
        expect(idleRegistry.get(idleChatModel.messages)).toEqual([]);

        const runningSession = yield* makeStubSession(chat, feed, batches, { running: true });
        const observableRegistry = AtomRegistry.make();
        const chatModel = new ChatModel(
          session,
          yield* makeTestRuntime,
          feed,
          yield* makeStubSpaceLayer({
            getSession: () => Effect.succeed(runningSession),
            hydrate: () => Effect.void,
          }),
          { chat: Ref.make(chat), observableRegistry },
        );

        const activeSnapshots: boolean[] = [];
        const unsubscribers = [
          observableRegistry.subscribe(chatModel.messages, () => {}, { immediate: true }),
          observableRegistry.subscribe(chatModel.active, (active) => activeSnapshots.push(active), {
            immediate: true,
          }),
        ];
        yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribers.forEach((unsubscribe) => unsubscribe())));

        unsubscribers.push(chatModel.adopt());
        yield* whenAtom(observableRegistry, chatModel.active, (active) => !active && activeSnapshots.includes(true));

        expect(activeSnapshots).toContain(true);
        expect(observableRegistry.get(chatModel.active)).toBe(false);
        expect(texts(observableRegistry.get(chatModel.messages))).toEqual(['Still working…']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'stops consuming the stream when the observer is disposed mid-turn',
    Effect.fn(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        // The chat model resolves its agent session from the chat it runs on.
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        const runtime = yield* Effect.context<Database.Service>();
        const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));

        const messageId = Obj.ID.random();
        const { session: gated, release } = yield* makeGatedSession(
          chat,
          feed,
          [traceMessage([partialBlockEvent(messageId, 'Still', true)])],
          [traceMessage([partialBlockEvent(messageId, 'Still working…', false)])],
        );

        const observableRegistry = AtomRegistry.make();
        const chatModel = new ChatModel(
          session,
          yield* makeTestRuntime,
          feed,
          yield* makeStubSpaceLayer({
            getSession: () => Effect.succeed(gated),
            hydrate: () => Effect.void,
          }),
          { chat: Ref.make(chat), observableRegistry },
        );

        const unsubscribe = observableRegistry.subscribe(chatModel.messages, () => {}, { immediate: true });
        yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()));

        const dispose = chatModel.adopt();
        yield* whenAtom(observableRegistry, chatModel.messages, (messages) => messages.length > 0);
        expect(texts(observableRegistry.get(chatModel.messages))).toEqual(['Still']);

        dispose();
        yield* release;
        yield* quiesce;

        expect(texts(observableRegistry.get(chatModel.messages))).toEqual(['Still']);
        expect(observableRegistry.get(chatModel.active)).toBe(false);
        // The session still reports a turn in flight, so the observer stopped because it was
        // disposed rather than because the turn settled.
        expect(observableRegistry.get(gated.running)).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reports each phase while the turn runs, then clears once the request settles',
    Effect.fn(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        // The chat model resolves its agent session from the chat it runs on.
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        const runtime = yield* Effect.context<Database.Service>();
        const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));

        const messageId = Obj.ID.random();
        const batches = [
          traceMessage([requestPhaseEvent('preparing')]),
          traceMessage([requestPhaseEvent('connecting-mcp')]),
          // A re-issued provider request: the attempt count is what distinguishes it from a stall.
          traceMessage([requestPhaseEvent('contacting-provider', 3)]),
          traceMessage([partialBlockEvent(messageId, 'Hello', true)]),
        ];
        const stubSession = yield* makeStubSession(chat, feed, batches);
        const stubAgentService: AgentService.Service = {
          getSession: () => Effect.succeed(stubSession),
          hydrate: () => Effect.void,
        };
        const spaceLayer = yield* makeStubSpaceLayer(stubAgentService);

        const observableRegistry = AtomRegistry.make();
        const chatModelRuntime = yield* makeTestRuntime;
        const chatModel = new ChatModel(session, chatModelRuntime, feed, spaceLayer, {
          chat: Ref.make(chat),
          observableRegistry,
        });

        const snapshots: (string | undefined)[] = [];
        const attempts: (number | undefined)[] = [];
        const unsubscribe = observableRegistry.subscribe(
          chatModel.activity,
          (activity) => {
            snapshots.push(activity?.phase);
            attempts.push(activity?.attempt);
          },
          { immediate: true },
        );
        yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()));

        yield* Effect.promise(() => chatModel.request({ message: 'Hello?' }));

        const error = observableRegistry.get(chatModel.error);
        expect(error._tag === 'Some' ? `${error.value.message}: ${error.value.cause}` : undefined).toBeUndefined();

        // `starting` is set locally before the process resolves, so it precedes anything the agent
        // itself can report; the agent's own phases follow in the order it entered them.
        expect(snapshots).toEqual(
          expect.arrayContaining(['starting', 'preparing', 'connecting-mcp', 'contacting-provider', 'generating']),
        );
        expect(snapshots.indexOf('starting')).toBeLessThan(snapshots.indexOf('preparing'));
        expect(snapshots.indexOf('connecting-mcp')).toBeLessThan(snapshots.indexOf('contacting-provider'));
        expect(attempts[snapshots.indexOf('contacting-provider')]).toBe(3);

        // A streamed block no longer clears the phase line — an agentic turn streams a little and then
        // works for a long time — it moves it to `generating`, and only the settled request clears
        // it: the two empty snapshots are the subscription's immediate read and the settle.
        expect(snapshots.indexOf('contacting-provider')).toBeLessThan(snapshots.indexOf('generating'));
        expect(snapshots.filter((phase) => phase === undefined)).toHaveLength(2);
        expect(snapshots.at(-1)).toBeUndefined();
        expect(observableRegistry.get(chatModel.activity)).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'ignores phases and partials that arrive after newer ones',
    Effect.fn(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed) }));
        const runtime = yield* Effect.context<Database.Service>();
        const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));

        // The swarm relay reorders: each stale event follows the newer one it predates.
        const messageId = Obj.ID.random();
        const batches = [
          traceMessage([requestPhaseEvent('contacting-provider', undefined, 30)]),
          traceMessage([requestPhaseEvent('encoding-prompt', undefined, 20)]),
          traceMessage([partialBlockEvent(messageId, 'Hello', true, 40)]),
          traceMessage([partialBlockEvent(messageId, 'Hel', true, 35)]),
          traceMessage([partialBlockEvent(messageId, 'Hello world.', false, 50)]),
          // A tool phase, then a block of a message not seen yet but produced before it.
          traceMessage([requestPhaseEvent('calling-tool', undefined, 70)]),
          traceMessage([partialBlockEvent(Obj.ID.random(), 'Earlier', true, 60)]),
        ];
        const stubSession = yield* makeStubSession(chat, feed, batches);
        const observableRegistry = AtomRegistry.make();
        const chatModel = new ChatModel(
          session,
          yield* makeTestRuntime,
          feed,
          yield* makeStubSpaceLayer({ getSession: () => Effect.succeed(stubSession), hydrate: () => Effect.void }),
          { chat: Ref.make(chat), observableRegistry },
        );

        const phases: (string | undefined)[] = [];
        const streamed: string[][] = [];
        const unsubscribers = [
          observableRegistry.subscribe(chatModel.activity, (activity) => phases.push(activity?.phase), {
            immediate: true,
          }),
          observableRegistry.subscribe(chatModel.messages, (messages) => streamed.push(texts(messages)), {
            immediate: true,
          }),
        ];
        yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribers.forEach((unsubscribe) => unsubscribe())));

        yield* Effect.promise(() => chatModel.request({ message: 'Hello?' }));

        expect(phases).not.toContain('encoding-prompt');
        // The older block still streams, but the line keeps naming the tool rather than `generating`.
        expect(phases.slice(phases.indexOf('calling-tool'))).not.toContain('generating');
        expect(streamed).not.toContainEqual(['Hel']);
        expect(texts(observableRegistry.get(chatModel.messages))).toEqual(['Hello world.', 'Earlier']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

//
// Helpers.
//

/** Builds a trace event carrying a request setup phase (the payload the activity atom consumes). */
const requestPhaseEvent = (phase: Trace.RequestPhaseName, attempt?: number, timestamp = 0): Trace.Event => ({
  timestamp,
  type: Trace.RequestPhase.key,
  data: { phase, ...(attempt !== undefined ? { attempt } : {}) },
});

/** Builds a trace event carrying an assistant text block (the payload `#handleEphemeralMessage` consumes). */
const partialBlockEvent = (messageId: string, text: string, pending: boolean, timestamp = 0): Trace.Event => ({
  timestamp,
  type: Trace.PartialBlock.key,
  data: {
    messageId,
    role: 'assistant',
    block: { _tag: 'text', text, ...(pending ? { pending } : {}) } satisfies ContentBlock.Text,
  },
});

const texts = (messages: readonly Message.Message[]): string[] =>
  messages.map(({ blocks }) => blocks.map((block) => (block as ContentBlock.Text).text).join(''));

/** Wraps events in the trace envelope `subscribeEphemeral` delivers. */
const traceMessage = (events: Trace.Event[]): Trace.Message =>
  Obj.make(Trace.Message, { meta: {}, isEphemeral: true, events });

/** Empty tail that settles `done` on normal delivery only, so interruption leaves the turn running. */
const completeWhenDrained = (done: Deferred.Deferred<void>): Stream.Stream<Trace.Message> =>
  Stream.fromEffect(Deferred.succeed(done, undefined)).pipe(Stream.drain);

/** Resolves when `atom` first satisfies `predicate`. */
const whenAtom = <T>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<T>,
  predicate: (value: T) => boolean,
): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    const unsubscribe = registry.subscribe(
      atom,
      (value) => {
        if (predicate(value)) {
          resume(Effect.void);
        }
      },
      { immediate: true },
    );
    return Effect.sync(() => unsubscribe());
  });

/**
 * Bounded real-time window for the assertions that something did NOT happen, which no event can
 * signal. Real macrotasks because the test context virtualizes `Effect.sleep`.
 */
const quiesce = Effect.promise(
  () =>
    new Promise((resolve) => {
      setTimeout(resolve, 100);
    }),
);

/**
 * Stub {@link AgentService.Session} whose ephemeral stream replays a scripted batch sequence.
 * `waitForCompletion` resolves only after the stream has been fully delivered, mirroring the real
 * session's turn-settles-after-streaming ordering.
 */
const makeStubSession = (
  chat: Chat.Chat,
  feed: Feed.Feed,
  batches: Trace.Message[],
  options: { running?: boolean } = {},
): Effect.Effect<AgentService.Session, never, never> =>
  Effect.gen(function* () {
    const done = yield* Deferred.make<void>();
    return {
      chat,
      feed,
      getContext: () => Effect.succeed([]),
      addContext: () => Effect.void,
      submitPrompt: () => Effect.void,
      running: Atom.make(options.running ?? false),
      waitForCompletion: () => Deferred.await(done),
      terminate: () => Effect.void,
      // The completion signal rides the end of the stream rather than `Stream.ensuring`, which also
      // runs on interruption and would settle the turn when a collector is merely disposed.
      subscribeEphemeral: () => Stream.fromIterable(batches).pipe(Stream.concat(completeWhenDrained(done))),
    };
  });

/** Stub session whose stream pauses between the two batches; `release` resumes delivery. */
const makeGatedSession = (
  chat: Chat.Chat,
  feed: Feed.Feed,
  before: Trace.Message[],
  after: Trace.Message[],
): Effect.Effect<{ session: AgentService.Session; release: Effect.Effect<void> }, never, never> =>
  Effect.gen(function* () {
    const gate = yield* Deferred.make<void>();
    const done = yield* Deferred.make<void>();
    const session: AgentService.Session = {
      chat,
      feed,
      getContext: () => Effect.succeed([]),
      addContext: () => Effect.void,
      submitPrompt: () => Effect.void,
      running: Atom.make(true),
      waitForCompletion: () => Deferred.await(done),
      terminate: () => Effect.void,
      subscribeEphemeral: () =>
        Stream.fromIterable(before).pipe(
          Stream.concat(Stream.fromEffect(Deferred.await(gate)).pipe(Stream.flatMap(() => Stream.fromIterable(after)))),
          Stream.concat(completeWhenDrained(done)),
        ),
    };
    return { session, release: Deferred.succeed(gate, undefined).pipe(Effect.asVoid) };
  });
