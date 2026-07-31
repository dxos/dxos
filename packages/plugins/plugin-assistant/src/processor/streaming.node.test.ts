//
// Copyright 2026 DXOS.org
//

import { Registry as AtomRegistry } from '@effect-atom/atom';
import { describe, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Stream from 'effect/Stream';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiService, OpaqueToolkit } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as PluginManager from '@dxos/app-framework/PluginManager';
import { AiSession, PartialBlock } from '@dxos/assistant';
import { Chat } from '@dxos/assistant-toolkit';
import { ProcessManager } from '@dxos/compute-runtime';
import * as AgentService from '@dxos/compute/AgentService';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Obj, Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { type ContentBlock } from '@dxos/types';

import { AiChatProcessor } from './processor';

const TestLayer = AssistantTestLayer({ tracing: 'noop', types: [Chat.Chat, Feed.Feed] });

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

/** Wraps events in the trace envelope `subscribeEphemeral` delivers. */
const traceMessage = (events: Trace.Event[]): Trace.Message =>
  Obj.make(Trace.Message, { meta: {}, isEphemeral: true, events });

/**
 * Stub {@link AgentService.Session} whose ephemeral stream replays a scripted batch sequence.
 * `waitForCompletion` resolves only after the stream has been fully delivered, mirroring the real
 * session's turn-settles-after-streaming ordering.
 */
const makeStubSession = (
  feed: Feed.Feed,
  batches: Trace.Message[],
): Effect.Effect<AgentService.Session, never, never> =>
  Effect.gen(function* () {
    const done = yield* Deferred.make<void>();
    return {
      feed,
      getContext: () => Effect.succeed([]),
      addContext: () => Effect.void,
      submitPrompt: () => Effect.void,
      waitForCompletion: () => Deferred.await(done),
      terminate: () => Effect.void,
      subscribeEphemeral: () => Stream.fromIterable(batches).pipe(Stream.ensuring(Deferred.succeed(done, undefined))),
    };
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
    pluginLoader: (id: string) => Effect.dieMessage(`No plugins in test runtime: ${id}`),
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

describe('AiChatProcessor streaming', () => {
  it.scoped(
    'upserts partials, finalizes complete blocks, ignores late partials, and flushes on completion',
    Effect.fn(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        const runtime = yield* Effect.runtime<Database.Service>();
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
        const stubSession = yield* makeStubSession(feed, batches);
        const stubAgentService: AgentService.Service = {
          getSession: () => Effect.succeed(stubSession),
          hydrate: () => Effect.void,
        };

        // The processor's space layer: the test layer's real services with the stub agent service
        // swapped in.
        const services = yield* Effect.context<
          | Database.Service
          | Credential.CredentialsService
          | AiService.AiService
          | Registry.Service
          | OpaqueToolkit.OpaqueToolkitProvider
        >();
        const spaceLayer = Layer.mergeAll(
          Layer.succeedContext(
            Context.pick(
              Database.Service,
              Credential.CredentialsService,
              AiService.AiService,
              Registry.Service,
              OpaqueToolkit.OpaqueToolkitProvider,
            )(services),
          ),
          Layer.succeed(AgentService.AgentService, stubAgentService),
        );

        const observableRegistry = AtomRegistry.make();
        const processorRuntime = yield* makeTestRuntime;
        const processor = new AiChatProcessor(session, processorRuntime, feed, spaceLayer, { observableRegistry });

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
        const texts = messages.map(({ blocks }) => blocks.map((block) => (block as ContentBlock.Text).text).join(''));
        expect(texts).toEqual(['Hello world.', 'Working…']);

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
});
