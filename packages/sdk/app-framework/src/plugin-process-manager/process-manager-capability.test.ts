//
// Copyright 2026 DXOS.org
//

import { describe, expect, it, test } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import type { RemoteTraceMonitor } from '@dxos/compute-runtime';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { type LogConfig, type LogEntry, LogLevel, log } from '@dxos/log';

import { ActivationEvents, Capabilities } from '../common';
import { ActivationEvent, Capability, Plugin, PluginManager } from '../core';
import { makeDynamicRemoteTraceMonitor, makeDynamicTraceSink } from './process-manager-capability';
import { ProcessManagerPlugin } from './ProcessManagerPlugin';

const LateEvent = ActivationEvent.make('org.dxos.test.lateLayerSpec');

class TestService extends Context.Service<TestService, { value: string }>()('org.dxos.test.lateService') {}

const lateMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.lateLayerSpec'), name: 'Late LayerSpec' });

const LateSinkEvent = ActivationEvent.make('org.dxos.test.lateTraceSink');
const lateSinkMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.lateTraceSink'), name: 'Late TraceSink' });

const LateMonitorEvent = ActivationEvent.make('org.dxos.test.lateRemoteTraceMonitor');
const lateMonitorMeta = Plugin.makeMeta({
  key: DXN.make('org.dxos.test.lateRemoteTraceMonitor'),
  name: 'Late RemoteTraceMonitor',
});

describe('process manager LayerSpec snapshot', () => {
  it.effect('reports a LayerSpec contributed after the runtime was built', () =>
    Effect.gen(function* () {
      const errors: LogEntry[] = [];
      const removeProcessor = log.addProcessor((_config: LogConfig, entry: LogEntry) => {
        if (entry.level === LogLevel.ERROR) {
          errors.push(entry);
        }
      });

      // Gated on a runtime event rather than Startup, so it contributes AFTER the snapshot — the
      // mistake the `layerSpec` maker exists to make unrepresentable.
      const Late = Plugin.make(
        Plugin.define(lateMeta).pipe(
          Plugin.addModule({
            id: 'late-layer-spec',
            activatesOn: LateEvent,
            provides: [Capabilities.LayerSpec],
            activate: () =>
              Effect.succeed([
                Capability.contribute(
                  Capabilities.LayerSpec,
                  LayerSpec.make({ affinity: 'application', requires: [], provides: [TestService] }, () =>
                    Layer.succeed(TestService, { value: 'late' }),
                  ),
                ),
              ]),
          }),
        ),
      );

      const manager = PluginManager.make({
        pluginLoader: () => Effect.die(new Error('not implemented')),
        plugins: [ProcessManagerPlugin(), Late()],
        enabled: [lateMeta.profile.key],
      });

      // Framework capabilities a host contributes; no module provides them.
      manager.capabilities.contribute({
        interface: Capabilities.PluginManager,
        implementation: manager,
        module: 'org.dxos.app-framework.plugin-manager',
      });
      manager.capabilities.contribute({
        interface: Capabilities.AtomRegistry,
        implementation: manager.registry,
        module: 'org.dxos.app-framework.atom-registry',
      });

      yield* manager.activate(ActivationEvents.Startup);
      expect(errors.filter((entry) => String(entry.message).includes('LayerSpec contributed after'))).toHaveLength(0);

      yield* manager.activate(LateEvent);

      const reported = errors.filter((entry) => String(entry.message).includes('LayerSpec contributed after'));
      expect(reported).toHaveLength(1);
      expect(String(reported[0].context?.module)).toContain('late-layer-spec');

      removeProcessor();
    }),
  );
});

describe('dynamic trace sink', () => {
  const message = Obj.make(Trace.Message, {
    meta: { runtimeName: Trace.CommonRuntimeName.local },
    isEphemeral: true,
    events: [{ type: 'status.update', timestamp: 0, data: { progress: { key: 'test#dynamic' } } }],
  });

  test('delivers to a sink contributed after the first write', ({ expect }) => {
    const early: string[] = [];
    const late: string[] = [];
    const factories: Capabilities.TraceSinkFactory[] = [() => ({ write: () => early.push('early') })];
    const sink = makeDynamicTraceSink(() => factories, ServiceResolver.empty);

    sink.write(message);
    expect([early.length, late.length]).toEqual([1, 0]);

    // plugin-progress's sink lands here — after the runtime was built. A snapshot would drop it, and
    // every operation's progress would silently never reach the UI.
    factories.push(() => ({ write: () => late.push('late') }));
    sink.write(message);
    expect([early.length, late.length]).toEqual([2, 1]);
  });

  test('builds each sink once, so per-sink state survives across writes', ({ expect }) => {
    let built = 0;
    const factories: Capabilities.TraceSinkFactory[] = [
      () => {
        built += 1;
        return { write: () => {} };
      },
    ];
    const sink = makeDynamicTraceSink(() => factories, ServiceResolver.empty);
    sink.write(message);
    sink.write(message);
    expect(built).toBe(1);
  });

  test('one throwing sink does not stop the next', ({ expect }) => {
    const reached: string[] = [];
    const factories: Capabilities.TraceSinkFactory[] = [
      () => ({
        write: () => {
          throw new Error('sink failed');
        },
      }),
      () => ({ write: () => reached.push('second') }),
    ];
    makeDynamicTraceSink(() => factories, ServiceResolver.empty).write(message);
    expect(reached).toEqual(['second']);
  });
});

describe('dynamic remote trace monitor', () => {
  const message = Obj.make(Trace.Message, {
    meta: { runtimeName: Trace.CommonRuntimeName.edgeIntrinsic },
    isEphemeral: true,
    events: [{ type: Trace.StatusUpdate.key, timestamp: 0, data: { progress: { key: 'test#remote' } } }],
  });

  /** Stand-in for the capability manager's live contributions view, plus a hook to signal registration. */
  const makeContributions = () => {
    const monitors: RemoteTraceMonitor.Monitor[] = [];
    const listeners = new Set<(values: readonly RemoteTraceMonitor.Monitor[]) => void>();
    let onSubscribed = () => {};
    const subscribed = new Promise<void>((resolve) => {
      onSubscribed = resolve;
    });
    return {
      subscribed,
      view: {
        get: () => monitors,
        subscribe: (cb: (values: readonly RemoteTraceMonitor.Monitor[]) => void) => {
          listeners.add(cb);
          onSubscribed();
          return () => listeners.delete(cb);
        },
      },
      contribute: (monitor: RemoteTraceMonitor.Monitor) => {
        monitors.push(monitor);
        for (const listener of listeners) {
          listener(monitors);
        }
      },
    };
  };

  it.effect('delivers from a monitor contributed after the subscription started', () =>
    Effect.gen(function* () {
      const { view, subscribed, contribute } = makeContributions();
      const fiber = yield* Effect.forkChild(
        Stream.runCollect(
          makeDynamicRemoteTraceMonitor(view)
            .subscribeToTraceMessages({ type: Trace.StatusUpdate.key })
            .pipe(Stream.take(1)),
        ),
      );

      // The ordering the snapshot lost: the aggregate monitor is subscribed before plugin-client's
      // swarm-backed monitor activates, so a baked-in no-op would leave this stream empty forever.
      yield* Effect.promise(() => subscribed);
      contribute({ subscribeToTraceMessages: () => Stream.make(message) });

      expect(yield* Fiber.join(fiber)).toEqual([message]);
    }),
  );

  it.effect('passes the filter through to the contributed monitor', () =>
    Effect.gen(function* () {
      const { view, subscribed, contribute } = makeContributions();
      const filters: Trace.Filter[] = [];
      const fiber = yield* Effect.forkChild(
        Stream.runCollect(
          makeDynamicRemoteTraceMonitor(view)
            .subscribeToTraceMessages({ type: Trace.StatusUpdate.key })
            .pipe(Stream.take(1)),
        ),
      );

      yield* Effect.promise(() => subscribed);
      contribute({
        subscribeToTraceMessages: (filter) => {
          filters.push(filter);
          return Stream.make(message);
        },
      });

      yield* Fiber.join(fiber);
      expect(filters).toEqual([{ type: Trace.StatusUpdate.key }]);
    }),
  );

  it.effect('keeps the live subscription when a second monitor is contributed behind the first', () =>
    Effect.gen(function* () {
      const { view, subscribed, contribute } = makeContributions();
      let subscriptions = 0;
      const first: RemoteTraceMonitor.Monitor = {
        subscribeToTraceMessages: () => {
          subscriptions += 1;
          return Stream.make(message).pipe(Stream.concat(Stream.never));
        },
      };
      const fiber = yield* Effect.forkChild(
        Stream.runCollect(
          makeDynamicRemoteTraceMonitor(view)
            .subscribeToTraceMessages({ type: Trace.StatusUpdate.key })
            .pipe(Stream.take(1)),
        ),
      );

      yield* Effect.promise(() => subscribed);
      contribute(first);
      // A second contribution leaves `[0]` in place: resubscribing would tear the live swarm stream
      // down underneath a running consumer.
      contribute({ subscribeToTraceMessages: () => Stream.empty });

      yield* Fiber.join(fiber);
      expect(subscriptions).toBe(1);
    }),
  );
});

describe('remote trace monitor contributed after startup', () => {
  const message = Obj.make(Trace.Message, {
    meta: { runtimeName: Trace.CommonRuntimeName.edgeIntrinsic },
    isEphemeral: true,
    events: [{ type: Trace.StatusUpdate.key, timestamp: 0, data: { progress: { key: 'test#late-monitor' } } }],
  });

  it.effect('reaches a ProcessMonitor consumer that subscribed before it landed', () =>
    Effect.gen(function* () {
      // Gated on a runtime event, the way plugin-client's swarm-backed monitor activates on demand:
      // the runtime is already built and its consumers already subscribed when this contributes.
      const Late = Plugin.make(
        Plugin.define(lateMonitorMeta).pipe(
          Plugin.addModule({
            id: 'late-remote-trace-monitor',
            activatesOn: LateMonitorEvent,
            provides: [Capabilities.RemoteTraceMonitor],
            activate: () =>
              Effect.succeed([
                Capability.contribute(Capabilities.RemoteTraceMonitor, {
                  subscribeToTraceMessages: () => Stream.make(message),
                }),
              ]),
          }),
        ),
      );

      const manager = PluginManager.make({
        pluginLoader: () => Effect.die(new Error('not implemented')),
        plugins: [ProcessManagerPlugin(), Late()],
        enabled: [lateMonitorMeta.profile.key],
      });
      manager.capabilities.contribute({
        interface: Capabilities.PluginManager,
        implementation: manager,
        module: 'org.dxos.app-framework.plugin-manager',
      });
      manager.capabilities.contribute({
        interface: Capabilities.AtomRegistry,
        implementation: manager.registry,
        module: 'org.dxos.app-framework.atom-registry',
      });

      yield* manager.activate(ActivationEvents.Startup);

      // The TraceProgress shape: subscribe to the aggregate, then wait for remote messages.
      const monitor = manager.capabilities.get(Capabilities.ProcessMonitor);
      const fiber = yield* Effect.forkChild(
        Stream.runCollect(monitor.subscribeToTraceMessages({ type: Trace.StatusUpdate.key }).pipe(Stream.take(1))),
      );

      yield* manager.activate(LateMonitorEvent);

      expect(yield* Fiber.join(fiber)).toEqual([message]);
    }),
  );
});
