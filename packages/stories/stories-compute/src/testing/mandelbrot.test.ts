//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Stream from 'effect/Stream';

import { ProcessManager } from '@dxos/compute-runtime';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';

import { MANDELBROT_PROCESS_KEY, MandelbrotProcess } from './mandelbrot.ts';

const TestLayer = ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator }).pipe(
  Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, ServiceResolver.empty)),
  Layer.provide(KeyValueStore.layerMemory),
  Layer.provide(OperationHandlerSet.provide(OperationHandlerSet.empty)),
  Layer.provide(Trace.layerNoop),
  Layer.provideMerge(Registry.layer),
);

describe('MandelbrotProcess', () => {
  // Live clock: the process reads `Date.now` for its idle watchdog, so a `TestClock` would not move it.
  it.live(
    'a revived process resumes the render where it stopped',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(MandelbrotProcess);
      const before = yield* handle.subscribeOutputs().pipe(Stream.take(2), Stream.runCollect, Effect.forkChild);
      yield* handle.submitInput({ frames: 4, size: 80, interval: 100 });
      expect((yield* Fiber.join(before)).map(({ frame }) => frame)).toEqual([0, 1]);

      // What a host does when its isolate is replaced: the process is created afresh from storage.
      yield* manager.shutdown();
      yield* manager.startup();
      const [dormant] = yield* manager.list({ key: MANDELBROT_PROCESS_KEY });
      const revived = yield* dormant.hydrate(MandelbrotProcess);
      const after = yield* revived.subscribeOutputs().pipe(Stream.take(2), Stream.runCollect, Effect.forkChild);

      // The remaining credit is still owed, and the zoom continues rather than restarting at frame 0.
      expect((yield* Fiber.join(after)).map(({ frame }) => frame)).toEqual([2, 3]);
      yield* revived.terminate();
    }, Effect.provide(TestLayer)),
    10_000,
  );
});
