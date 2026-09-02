//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Stream from 'effect/Stream';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiService, OpaqueToolkit } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManager from '@dxos/app-framework/PluginManager';
import { AiSession, PartialBlock } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import { ProcessManager } from '@dxos/compute-runtime';
import * as AgentService from '@dxos/compute/AgentService';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Obj, Ref, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { type ContentBlock, type Message } from '@dxos/types';

import { AiChatProcessor } from './processor';

const TestLayer = AssistantTestLayer({ tracing: 'noop', types: [Chat.Chat, Feed.Feed] });

describe('AiChatProcessor streaming', () => {
  it.effect(
    'upserts partials, finalizes complete blocks, ignores late partials, and flushes on completion',
    Effect.fn(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        // The processor resolves its agent session from the chat it runs on.
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
        const spaceLayer = yield* makeSpaceLayer(stubAgentService);

        const observableRegistry = AtomRegistry.make();
        const processorRuntime = yield* makeTestRuntime;
        const processor = new AiChatProcessor(session, processorRuntime, feed, spaceLayer, {
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
            processor.messages,
            (messages) =>
              snapshots.push(
                messages.map((message) => message.blocks.map((block) => (block as ContentBlock.Text).text).join('')),
              ),
            { immediate: true },
          ),
          observableRegistry.subscribe(processor.error, () => {}),
          observableRegistry.subscribe(processor.active, () => {}),
        ];
        yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribers.forEach((unsubscribe) => unsubscribe())));

        yield* Effect.promise(() => processor.request({ message: 'Hello?' }));

        // Surface any swallowed request failure before asserting on state.
        const error = observableRegistry.get(processor.error);
        expect(error._tag === 'Some' ? `${error.value.message}: ${error.value.cause}` : undefined).toBeUndefined();

        // m1 was finalized exactly once (the late partial after finalization is dropped); m2's
        // unfinalized partial was flushed into the pending list when the agent completed.
        const messages = observableRegistry.get(processor.messages);
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
        expect(observableRegistry.get(processor.streaming)).toBe(false);
        expect(observableRegistry.get(processor.active)).toBe(false);
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
        // The processor resolves its agent session from the chat it runs on.
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
        const idleProcessor = new AiChatProcessor(
          session,
          yield* makeTestRuntime,
          feed,
          yield* makeSpaceLayer({
            getSession: () => Effect.succeed(idleSession),
            hydrate: () => Effect.void,
          }),
          { chat: Ref.make(chat), observableRegistry: idleRegistry },
        );
        const idleUnsubscribers = [
          idleRegistry.subscribe(idleProcessor.messages, () => {}, { immediate: true }),
          idleProcessor.adopt(),
        ];
        yield* Effect.addFinalizer(() => Effect.sync(() => idleUnsubscribers.forEach((dispose) => dispose())));
        yield* quiesce;
        // A live-but-idle agent (awaiting input) is not adopted.
        expect(idleRegistry.get(idleProcessor.active)).toBe(false);
        expect(idleRegistry.get(idleProcessor.messages)).toEqual([]);

        const runningSession = yield* makeStubSession(chat, feed, batches, { running: true });
        const observableRegistry = AtomRegistry.make();
        const processor = new AiChatProcessor(
          session,
          yield* makeTestRuntime,
          feed,
          yield* makeSpaceLayer({
            getSession: () => Effect.succeed(runningSession),
            hydrate: () => Effect.void,
          }),
          { chat: Ref.make(chat), observableRegistry },
        );

        const activeSnapshots: boolean[] = [];
        const unsubscribers = [
          observableRegistry.subscribe(processor.messages, () => {}, { immediate: true }),
          observableRegistry.subscribe(processor.active, (active) => activeSnapshots.push(active), {
            immediate: true,
          }),
        ];
        yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribers.forEach((unsubscribe) => unsubscribe())));

        unsubscribers.push(processor.adopt());
        yield* whenAtom(observableRegistry, processor.active, (active) => !active && activeSnapshots.includes(true));

        expect(activeSnapshots).toContain(true);
        expect(observableRegistry.get(processor.active)).toBe(false);
        expect(texts(observableRegistry.get(processor.messages))).toEqual(['Still working…']);
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
        // The processor resolves its agent session from the chat it runs on.
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
        const processor = new AiChatProcessor(
          session,
          yield* makeTestRuntime,
          feed,
          yield* makeSpaceLayer({
            getSession: () => Effect.succeed(gated),
            hydrate: () => Effect.void,
          }),
          { chat: Ref.make(chat), observableRegistry },
        );

        const unsubscribe = observableRegistry.subscribe(processor.messages, () => {}, { immediate: true });
        yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()));

        const dispose = processor.adopt();
        yield* whenAtom(observableRegistry, processor.messages, (messages) => messages.length > 0);
        expect(texts(observableRegistry.get(processor.messages))).toEqual(['Still']);

        dispose();
        yield* release;
        yield* quiesce;

        expect(texts(observableRegistry.get(processor.messages))).toEqual(['Still']);
        expect(observableRegistry.get(processor.active)).toBe(false);
        // The session still reports a turn in flight, so the observer stopped because it was
        // disposed rather than because the turn settled.
        expect(observableRegistry.get(gated.running)).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

//
// Helpers.
//

/** Builds a trace event carrying an assistant text block (the payload `#handleEphemeralMessage` consumes). */
const partialBlockEvent = (messageId: string, text: string, pending: boolean): Trace.Event => ({
  timestamp: 0,
  type: PartialBlock.key,
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

/** The processor's space layer: the test layer's real services with the stub agent service swapped in. */
const makeSpaceLayer = (agentService: AgentService.Service) =>
  Effect.gen(function* () {
    const services = yield* Effect.context<
      | Database.Service
      | Credential.CredentialsService
      | AiService.AiService
      | Registry.Service
      | OpaqueToolkit.OpaqueToolkitProvider
    >();
    return Layer.mergeAll(
      Layer.succeedContext(
        Context.pick(
          Database.Service,
          Credential.CredentialsService,
          AiService.AiService,
          Registry.Service,
          OpaqueToolkit.OpaqueToolkitProvider,
        )(services),
      ),
      Layer.succeed(AgentService.AgentService, agentService),
    );
  });

/**
 * A sound {@link Capabilities.ProcessManagerRuntime} for tests: a `ManagedRuntime` over the
 * assistant test layer's process services plus a bare `PluginManager` for the capability/plugin
 * tags. Scoped so the runtime is disposed with the test.
 */
const makeTestRuntime = Effect.gen(function* () {
  const services = yield* Effect.context<
    | ProcessManager.Service
    | Operation.Service
    | ProcessManager.ProcessOperationInvoker.Service
    | ServiceResolver.ServiceResolver
  >();
  const manager = PluginManager.make({
    pluginLoader: (id: string) => Effect.die(new Error(`No plugins in test runtime: ${id}`)),
    plugins: [],
  });
  const runtime: Capabilities.ProcessManagerRuntime = ManagedRuntime.make(
    Layer.mergeAll(
      Layer.succeedContext(services),
      Layer.succeed(Capability.Service, manager.capabilities),
      Layer.succeed(Plugin.Service, manager),
    ),
  );
  yield* Effect.addFinalizer(() =>
    Effect.promise(() => (runtime as ManagedRuntime.ManagedRuntime<never, never>).dispose()),
  );
  return runtime;
});
