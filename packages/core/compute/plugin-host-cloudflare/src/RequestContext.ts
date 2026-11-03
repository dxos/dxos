//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Cancellation from '@dxos/compute/Cancellation';
import type * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import { Database, type Entity, Feed, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { messageOf } from '@dxos/errors';
import { URI } from '@dxos/keys';
import { log } from '@dxos/log';
import type { PluginProtocol, TraceProtocol } from '@dxos/protocols';

//
// The per-call context operation-service gives a handler, rebuilt from the `InvocationScope` (EDGE-PLUGINS F-5.6).
//

/** Bound on draining the trace sink at the end of an invocation: a wedged sink must not hold the handler. */
const SINK_DRAIN_TIMEOUT = 10_000;

type Handler = Operation.WithHandler<Operation.Definition.Any>;

type HandlerEffect = ReturnType<Handler['handler']>;

/** Runs `transform` over the handler's Effect. */
export const mapHandler = (handler: Handler, transform: (effect: HandlerEffect) => HandlerEffect): Handler => ({
  ...handler,
  handler: (input: unknown) => transform(handler.handler(input)),
});

/**
 * Forwards an invocation's trace messages to the caller's sink, and tracks the RPC calls so they are drained before the
 * invocation returns: a call still pending pins the RPC session, and with it the invocation (DX-1138).
 */
export class TraceForwarder {
  readonly #sink: PluginProtocol.TraceSink | undefined;
  readonly #meta: Trace.Meta;
  readonly #pending = new Set<Promise<unknown>>();

  constructor(sink: PluginProtocol.TraceSink | undefined, meta: Trace.Meta) {
    this.#sink = sink;
    this.#meta = meta;
  }

  /** The `traceService` of the handler's function context. */
  readonly service: TraceProtocol.TraceService = {
    write: (events) => {
      const timestamp = Date.now();
      for (const event of events) {
        this.#write({
          meta: this.#meta,
          isEphemeral: event.isEphemeral,
          events: [{ type: event.key, timestamp, data: event.data }],
        });
      }
    },
  };

  start(info: { key: string; name?: string }): void {
    this.#write({
      meta: this.#meta,
      isEphemeral: Trace.OperationStart.isEphemeral,
      events: [{ type: Trace.OperationStart.key, timestamp: Date.now(), data: info }],
    });
  }

  end(info: { key: string; name?: string }, error: unknown): void {
    this.#write({
      meta: this.#meta,
      isEphemeral: Trace.OperationEnd.isEphemeral,
      events: [
        {
          type: Trace.OperationEnd.key,
          timestamp: Date.now(),
          data: {
            ...info,
            outcome: error === undefined ? 'success' : 'failure',
            error: error === undefined ? undefined : (messageOf(error) ?? String(error)),
            errorCode: Process.RunAgainError.is(error) ? Process.RUN_AGAIN_ERROR_CODE : undefined,
          },
        },
      ],
    });
  }

  /** Awaits every pending write, bounded. */
  async drain(): Promise<void> {
    if (this.#pending.size === 0) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, SINK_DRAIN_TIMEOUT);
    });
    try {
      await Promise.race([Promise.allSettled([...this.#pending]), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  #write(data: Trace.MessageData): void {
    if (this.#sink === undefined) {
      return;
    }
    // A trace that cannot be delivered must not change the operation's outcome.
    try {
      const pending = Promise.resolve(this.#sink.write(Obj.toJSON(Obj.make(Trace.Message, data)))).catch((error) =>
        log.warn('could not forward a trace message', { error }),
      );
      this.#pending.add(pending);
      void pending.finally(() => this.#pending.delete(pending));
    } catch (error) {
      log.warn('could not forward a trace message', { error });
    }
  }
}

/**
 * The handler's cancellation signal, aborted when the caller's `waitForCancel` resolves while the invocation runs.
 * `dispose` releases the caller's stub, whose pending call otherwise pins the invocation (DX-1138).
 */
export const listenForCancel = (
  cancellation: PluginProtocol.CancellationSignal | undefined,
): { readonly signal: AbortSignal; readonly dispose: () => void } => {
  const controller = new AbortController();
  if (cancellation !== undefined) {
    // The caller also settles the call when the invocation ends, after which aborting is harmless.
    void cancellation.waitForCancel().then(
      () => controller.abort(),
      () => {},
    );
  }
  return {
    signal: controller.signal,
    dispose: () => {
      for (const target of [cancellation?.waitForCancel, cancellation]) {
        disposeStub(target);
      }
    },
  };
};

/** Disposes a Workers RPC stub; a plain value (in-process tests) or a stub already disposed is ignored. */
const disposeStub = (target: unknown): void => {
  if ((typeof target === 'object' || typeof target === 'function') && target !== null && Symbol.dispose in target) {
    const dispose = Reflect.get(target, Symbol.dispose);
    if (typeof dispose === 'function') {
      try {
        Reflect.apply(dispose, target, []);
      } catch {
        // Already disposed.
      }
    }
  }
};

/** Gives the handler the invocation's {@link Cancellation.Service}; cooperative, so nothing is interrupted. */
export const withCancellation = (handler: Handler, signal: AbortSignal): Handler =>
  mapHandler(handler, (effect) => effect.pipe(Effect.provideService(Cancellation.Service, { signal })));

/**
 * Gives the handler the conversation's `HarnessService`, rebuilt from the chat or feed `conversation` names, since the
 * caller's session binder does not cross RPC. `@dxos/assistant` is imported only for an invocation with a conversation.
 */
export const withConversation = (handler: Handler, conversation: string | undefined): Handler =>
  conversation === undefined
    ? handler
    : mapHandler(handler, (effect) =>
        Effect.promise(() => harnessLayer(conversation)).pipe(
          Effect.flatMap((layer) => effect.pipe(Effect.provide(layer))),
          Effect.scoped,
        ),
      );

const harnessLayer = async (conversation: string) => {
  const [AiContext, Chat, Harness] = await Promise.all([
    import('@dxos/assistant/AiContext'),
    import('@dxos/assistant/Chat'),
    import('@dxos/assistant/Harness'),
  ]);

  /** A hosted agent names its chat; a brain wake names the feed itself. */
  const feedOf = (object: Entity.Unknown): Effect.Effect<Feed.Feed, never, Database.Service> =>
    Obj.instanceOf(Chat.Chat, object)
      ? Database.load(object.feed).pipe(Effect.orDie)
      : Obj.instanceOf(Feed.Feed, object)
        ? Effect.succeed(object)
        : Effect.die(new Error(`The conversation is not a chat or a feed: ${object.id}`));

  return Layer.effect(
    Harness.HarnessService,
    Effect.gen(function* () {
      const feed = yield* Database.resolve(URI.make(conversation)).pipe(Effect.orDie, Effect.flatMap(feedOf));
      const runtime: Context.Context<Database.Service> = yield* Effect.context<Database.Service>();
      const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
      return Harness.fromBinder({ feed, runtime, binder });
    }),
  );
};
