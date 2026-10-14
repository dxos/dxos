//
// Copyright 2026 DXOS.org
//
// Worker entry point for `IndexThread`: runs the watcher against the store the main thread also has
// open, and posts its events back. Loaded by the runtime directly, so imports carry `.ts`.
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Schema from 'effect/Schema';
import { parentPort, workerData } from 'node:worker_threads';

import * as IndexThread from './IndexThread.ts';
import * as Reasoner from './Reasoner.ts';
import * as Store from './Store.ts';
import * as Watch from './Watch.ts';

const port = parentPort;
if (port === null) {
  throw new Error('IndexWorker.ts runs as a worker thread, started by IndexThread.run.');
}

const post = (message: IndexThread.Outbound): Effect.Effect<void> =>
  Effect.sync(() => port.postMessage(Schema.encodeSync(IndexThread.Outbound)(message)));

// No `Lock.layer`: the main thread holds the store in this same process, and the addon shares it.
const watcher = Effect.gen(function* () {
  const options = yield* Schema.decodeUnknownEffect(IndexThread.WorkerData)(workerData);
  const reasoners = yield* Reasoner.load(options.rules);
  return yield* Watch.run({ root: options.root, reasoners, debounceMs: options.debounceMs, onEvent: post }).pipe(
    Effect.provide(Store.layer(options.storeDir)),
  );
}).pipe(
  Effect.scoped,
  Effect.catchCause((cause) =>
    Cause.hasInterruptsOnly(cause) ? Effect.void : post({ _tag: 'Fatal', message: Cause.pretty(cause) }),
  ),
);

const fiber = Effect.runFork(watcher);

const isStop = Schema.is(IndexThread.Inbound);

port.on('message', (message: unknown) => {
  if (isStop(message)) {
    // Interrupting closes the store handle; the main thread terminates the worker once told.
    Effect.runFork(Fiber.interrupt(fiber).pipe(Effect.andThen(post({ _tag: 'Stopped' }))));
  }
});
