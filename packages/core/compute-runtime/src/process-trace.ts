//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Obj } from '@dxos/echo';
import { Process, Trace, TracingService } from '@dxos/functions';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import type { TracingOptions } from './ProcessManager';
import { detachData } from './trace-buffer';

/**
 * Build a process's base trace context by inheriting from the parent (if any)
 * and overlaying the spawn request's `tracing.message` / `tracing.toolCallId`.
 */
export const buildBaseTraceContext = (args: {
  readonly parentTraceContext?: TracingService.TraceContext;
  readonly tracing?: TracingOptions;
}): TracingService.TraceContext => {
  let baseContext: TracingService.TraceContext = args.parentTraceContext ? { ...args.parentTraceContext } : {};

  if (args.tracing) {
    if (args.tracing.message !== undefined) {
      baseContext = { ...baseContext, parentMessage: args.tracing.message };
    }
    if (args.tracing.toolCallId !== undefined) {
      baseContext = { ...baseContext, toolCallId: args.tracing.toolCallId };
    }
  }

  return baseContext;
};

export interface ProcessTraceServiceOptions {
  /** Id of the process whose events we're tagging. */
  readonly pid: Process.ID;
  /** Parent process id (if any) — copied onto {@link Trace.Message.meta}. */
  readonly parentPid?: Process.ID;
  /** Human-readable process name for trace visualization. */
  readonly processName?: string;
  /** Additional meta copied onto every {@link Trace.Message}. */
  readonly traceMeta?: Trace.Meta;
  /** Space scope for persistence routing. */
  readonly space?: SpaceId;
  /** Shared, durable sink for non-ephemeral events. */
  readonly sink: Trace.Sink;
  /** Called for ephemeral events; typically pushed into the process handle's in-memory buffer. */
  readonly onEphemeral: (message: Trace.Message) => void;
}

/**
 * Build a per-process {@link Trace.TraceService} implementation that:
 *
 * - Packages each raw event into a {@link Trace.Message} with process/space meta.
 * - Detaches ECHO proxies from the event payload before embedding them as
 *   `Schema.Unknown` data (see {@link detachData}).
 * - Streams ephemeral events to `onEphemeral` (never persisted).
 * - Forwards non-ephemeral events to the shared durable sink.
 * - Swallows and logs write errors so a single bad event cannot kill the process.
 */
export const createProcessTraceService = (
  opts: ProcessTraceServiceOptions,
): Context.Tag.Service<typeof Trace.TraceService> => ({
  write: (event, data) => {
    try {
      // TODO(dmaretskyi): Batching.
      // Detach `data` from any ECHO proxy state — nested reactive
      // objects would otherwise cause `Obj.make` to fail when it
      // recurses through the Schema.Unknown event payload and tries
      // to re-attach schema metadata to non-configurable proxies.
      const detachedData = detachData(data);
      const message = Obj.make(Trace.Message, {
        meta: {
          ...(opts.traceMeta ?? {}),
          pid: opts.pid,
          parentPid: opts.parentPid,
          processName: opts.processName,
          space: opts.space ?? opts.traceMeta?.space,
        },
        isEphemeral: event.isEphemeral,
        events: [
          {
            type: event.key,
            timestamp: Date.now(),
            data: detachedData,
          },
        ],
      });
      // Ephemeral events are streamed live to subscribers and never
      // persisted; non-ephemeral events are forwarded to the shared
      // trace sink (feed persistence, devtools, etc.).
      if (message.isEphemeral) {
        opts.onEphemeral(message);
      } else {
        opts.sink.write(message);
      }
    } catch (err) {
      log.warn('trace write failed', { pid: opts.pid, event: event.key, err });
    }
  },
});

export interface ProcessTracingSetupOptions {
  /** Id of the process being set up. */
  readonly pid: Process.ID;
  /** Process definition key — copied into the invocation payload. */
  readonly definitionKey: string;
  /** Process params (name, target) — copied into the invocation payload. */
  readonly params: Process.Params;
  /** Trace invocation payload/target overrides from the spawn request. */
  readonly invocationPayload?: Partial<TracingService.FunctionInvocationPayload>;
  readonly invocationTarget?: import('@dxos/echo').DXN;
  /** Pre-built base trace context (inherited from parent + spawn options). */
  readonly traceContext: TracingService.TraceContext;
  /** Whether this is a root process (no parent). Only root processes emit a `traceInvocationStart`. */
  readonly isRoot: boolean;
  /** The manager-level tracing service that backs invocation start/end. */
  readonly parentTracingService: Context.Tag.Service<typeof TracingService>;
}

export interface ProcessTracingSetup {
  /** The invocation trace (if the process is root and tracing is enabled). */
  readonly invocationTrace: TracingService.InvocationTraceData | undefined;
  /**
   * The trace context to use for this process — includes `currentInvocation`
   * when the root process opens a new invocation.
   */
  readonly traceContext: TracingService.TraceContext;
  /** Per-process `TracingService` implementation, ready to go into the context. */
  readonly tracingService: Context.Tag.Service<typeof TracingService>;
}

/**
 * Prepare the per-process {@link TracingService} wiring:
 *
 * 1. For root processes, call `traceInvocationStart` on the parent tracing
 *    service to open a new invocation trace; attach it to the trace context.
 * 2. When an invocation trace is open, wrap the parent tracing service in
 *    `TracingService.layerInvocation` so that `write`/`traceInvocationStart`/
 *    `traceInvocationEnd` record against that invocation's queue.
 * 3. Return a `TracingService` whose `getTraceContext` snapshots the
 *    process's trace context and whose other methods forward to the inner
 *    (possibly layered) tracing service.
 */
export const prepareProcessTracing = (
  opts: ProcessTracingSetupOptions,
): Effect.Effect<ProcessTracingSetup> =>
  Effect.gen(function* () {
    let traceContext = opts.traceContext;

    let invocationTrace: TracingService.InvocationTraceData | undefined;
    if (opts.isRoot) {
      const mergedPayload: TracingService.FunctionInvocationPayload = {
        ...opts.invocationPayload,
        process: {
          pid: opts.pid,
          key: opts.definitionKey,
          name: opts.params.name ?? undefined,
          target: opts.params.target != null ? String(opts.params.target) : undefined,
        },
      };
      invocationTrace = yield* opts.parentTracingService.traceInvocationStart({
        payload: mergedPayload,
        target: opts.invocationTarget,
      });
      traceContext = { ...traceContext, currentInvocation: invocationTrace };
    }

    log('process trace config', { pid: opts.pid, invocationTrace });
    const invocationTracingService = invocationTrace?.invocationTraceQueue
      ? yield* TracingService.pipe(
          Effect.provide(
            TracingService.layerInvocation(invocationTrace).pipe(
              Layer.provide(Layer.succeed(TracingService, opts.parentTracingService)),
            ),
          ),
        )
      : opts.parentTracingService;

    const tracingService: Context.Tag.Service<typeof TracingService> = {
      getTraceContext: () => traceContext,
      write: (event, traceCtx) => {
        log('trace event', { pid: opts.pid, event: JSON.stringify(event), traceCtx: JSON.stringify(traceCtx) });
        invocationTracingService.write(event, traceCtx);
      },
      ephemeral: (event, traceCtx) => {
        log('ephemeral trace event (deprecated)', {
          pid: opts.pid,
          event: JSON.stringify(event).slice(0, 50),
          traceCtx: JSON.stringify(traceCtx),
        });
      },
      traceInvocationStart: (startOpts) => invocationTracingService.traceInvocationStart(startOpts),
      traceInvocationEnd: (endOpts) => invocationTracingService.traceInvocationEnd(endOpts),
    };

    return { invocationTrace, traceContext, tracingService };
  });
