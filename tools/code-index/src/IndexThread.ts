//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Cause from 'effect/Cause';
import * as Data from 'effect/Data';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import { Worker } from 'node:worker_threads';

import * as Watch from './Watch.ts';

/**
 * Runs `serve`'s watcher (`Watch.ts`) on a worker thread, so crawling, committing and reasoning
 * never share an event loop with the HTTP server, Vite and the agent. Both threads open the same
 * store directory: the addon hands the second opener the store the first already holds, so the main
 * thread reads it directly instead of asking the worker.
 */

export class IndexThreadError extends Data.TaggedError('code-index/IndexThreadError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/** What the worker is started with; everything else it loads itself, since reasoners carry code. */
export const WorkerData = Schema.Struct({
  root: Schema.String,
  storeDir: Schema.String,
  /** The rules directory `Reasoner.load` reads. */
  rules: Schema.String,
  debounceMs: Schema.optional(Schema.Number),
});

export type WorkerData = typeof WorkerData.Type;

/** The worker's acknowledgement of `Stop`, sent once its store handle is closed. */
const Stopped = Schema.TaggedStruct('Stopped', {});

const isStopped = Schema.is(Stopped);

/** Worker to main: a watcher event, the acknowledgement of `Stop`, or why the watcher could not start. */
export const Outbound = Schema.Union([Watch.Event, Stopped, Schema.TaggedStruct('Fatal', { message: Schema.String })]);

export type Outbound = typeof Outbound.Type;

/** Main to worker: close the store and stop watching. */
export const Inbound = Schema.TaggedStruct('Stop', {});

export type Inbound = typeof Inbound.Type;

/**
 * How long shutdown waits for the worker to close its handle before terminating it. A native call
 * in flight (a reasoning run) holds the store until it returns, and SIGINT must not wait for that.
 */
const STOP_TIMEOUT_MS = 500;

const WORKER_URL = new URL('./IndexWorker.ts', import.meta.url);

export type Options = WorkerData & {
  /** Each watcher event; defaults to the console lines `Watch.log` writes. */
  readonly onEvent?: (event: Watch.Event) => Effect.Effect<void>;
};

const decode = Schema.decodeUnknownEffect(Outbound);

/**
 * Starts the worker and relays its events until the scope closes, which stops it. Fails if the
 * worker cannot start its watcher or dies; a failed pass is an event, not a failure.
 */
export const run = ({ onEvent = Watch.log, ...data }: Options): Effect.Effect<never, IndexThreadError, Scope.Scope> =>
  Effect.gen(function* () {
    const stopped = yield* Deferred.make<void>();
    // The worker is created inside the stream's scope so its listeners exist before it can post.
    const messages = Stream.callback<unknown, IndexThreadError>((queue) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const worker = new Worker(WORKER_URL, { workerData: Schema.encodeSync(WorkerData)(data) });
          // Seen here, not by the consumer: at shutdown the consumer is already interrupted.
          worker.on('message', (message: unknown) => {
            if (isStopped(message)) {
              Deferred.doneUnsafe(stopped, Exit.void);
            } else {
              Queue.offerUnsafe(queue, message);
            }
          });
          worker.on('error', (cause) =>
            Queue.failCauseUnsafe(queue, Cause.fail(new IndexThreadError({ message: 'Indexer thread failed', cause }))),
          );
          worker.on('exit', (code) =>
            Queue.failCauseUnsafe(
              queue,
              Cause.fail(new IndexThreadError({ message: `Indexer thread exited with code ${code}` })),
            ),
          );
          return worker;
        }),
        (worker) =>
          Effect.sync(() => worker.postMessage(Schema.encodeSync(Inbound)({ _tag: 'Stop' }))).pipe(
            Effect.andThen(Deferred.await(stopped)),
            Effect.timeoutOption(STOP_TIMEOUT_MS),
            Effect.andThen(Effect.promise(() => worker.terminate())),
            Effect.asVoid,
          ),
      ),
    );

    yield* messages.pipe(
      Stream.mapEffect((message) =>
        decode(message).pipe(
          Effect.mapError(
            (cause) => new IndexThreadError({ message: 'Unreadable message from the indexer thread', cause }),
          ),
        ),
      ),
      Stream.runForEach((message) => {
        switch (message._tag) {
          case 'Stopped':
            return Effect.void;
          case 'Fatal':
            return Effect.fail(new IndexThreadError({ message: `Indexer thread could not start: ${message.message}` }));
          default:
            return onEvent(message);
        }
      }),
    );
    return yield* Effect.fail(new IndexThreadError({ message: 'Indexer thread ended' }));
  });
