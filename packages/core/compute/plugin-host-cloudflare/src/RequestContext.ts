//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import * as Agent from '@dxos/compute/Agent';
import * as Cancellation from '@dxos/compute/Cancellation';
import type * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { Annotation, Obj } from '@dxos/echo';
import { messageOf } from '@dxos/errors';
import { type SpaceId, URI } from '@dxos/keys';
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
 * Runs an invocation that names a conversation as a process working for that session, as `ProcessOperationInvoker` runs
 * one locally: `Agent.currentSession` and the other current-process verbs read the session from the process's
 * `SessionAnnotation`, and the process supplies `Agent.Service` and `Process.ManagerService` to an operation that
 * declares them (a hook such as `ensureReplySent`). The body still runs with every service the wrappers outside it
 * provide. The runtimes are imported only for an invocation with a conversation.
 */
export const withSession = (
  handler: Handler,
  conversation: string | undefined,
  spaceId: SpaceId | undefined,
): Handler =>
  conversation === undefined
    ? handler
    : {
        ...handler,
        handler: (input: unknown) =>
          Effect.gen(function* () {
            const session = URI.make(conversation);
            const invocation = yield* Effect.context<never>();
            const inProcess: Handler = {
              ...handler,
              handler: (processInput: unknown) => handler.handler(processInput).pipe(Effect.provide(invocation)),
            };
            // `Agent.Service` is built over the stack the process is spawned from, so the resolver reads it once the
            // stack is up: the process asks for it only when it spawns.
            const agents: { service?: Agent.ServiceApi } = {};
            const resolver = ServiceResolver.compose(
              ServiceResolver.fromContext(invocation),
              ServiceResolver.succeed(Agent.Service, () =>
                agents.service === undefined
                  ? Effect.die(new Error('The agent service is not up yet.'))
                  : Effect.succeed(agents.service),
              ),
            );
            const { OperationProcess, stack } = yield* Effect.promise(() => sessionStack(inProcess, resolver));
            return yield* Effect.gen(function* () {
              agents.service = yield* Agent.Service;
              const process = yield* Process.spawn(OperationProcess.make(handler), input, {
                environment: { conversation: session, ...(spaceId === undefined ? {} : { space: spaceId }) },
                annotations: Annotation.buildDictionary((dictionary) => {
                  Annotation.setDictionary(dictionary, Process.SessionAnnotation, session);
                }),
              });
              return yield* Process.awaitOutput(process);
            }).pipe(Effect.provide(stack));
          }).pipe(Effect.scoped),
      };

/** One invocation's process stack: a local process manager running `handler`, no remote runtime, and `Agent.Service`. */
const sessionStack = async (handler: Handler, resolver: ServiceResolver.ServiceResolver) => {
  const [
    { OperationProcess, ProcessManager, RemoteProcessManager, RemoteTraceMonitor, UnifiedProcessManager },
    { AgentService },
  ] = await Promise.all([import('@dxos/compute-runtime'), import('@dxos/agent-runtime')]);
  const stack = AgentService.layer().pipe(
    Layer.provideMerge(UnifiedProcessManager.layer),
    Layer.provide(ProcessManager.layer({ runtimeName: Trace.CommonRuntimeName.edgeWorkerLoader })),
    Layer.provide(RemoteProcessManager.layerNoop),
    Layer.provide(RemoteTraceMonitor.layerNoop),
    Layer.provide(KeyValueStore.layerMemory),
    Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, resolver)),
    Layer.provide(OperationHandlerSet.provide(OperationHandlerSet.make(handler))),
    Layer.provide(Trace.layerNoop),
    Layer.provide(Layer.succeed(AtomRegistry.AtomRegistry, AtomRegistry.make())),
  );
  return { OperationProcess, stack };
};
