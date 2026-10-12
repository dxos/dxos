//
// Copyright 2026 DXOS.org
//

import { describe, expect, it, test } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Registry from 'effect/reactivity/AtomRegistry';

import { RemoteProcessManager } from '@dxos/compute-runtime';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { Obj } from '@dxos/echo';
import { DXN, SpaceId } from '@dxos/keys';
import { type LogConfig, type LogEntry, LogLevel, log } from '@dxos/log';

import { ActivationEvents, Capabilities } from '../common/index.ts';
import { ActivationEvent, Capability, Plugin, PluginManager } from '../core/index.ts';
import { makeDynamicTraceSink } from './process-manager-capability.ts';
import * as ProcessManagerPlugin from './ProcessManagerPlugin.ts';

const LateEvent = ActivationEvent.make('org.dxos.test.lateLayerSpec');

class TestService extends Context.Service<TestService, { value: string }>()('org.dxos.test.lateService') {}
class ProbeService extends Context.Service<ProbeService, { value: string }>()('org.dxos.test.probeService') {}

const lateMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.lateLayerSpec'), name: 'Late LayerSpec' });

const LateSinkEvent = ActivationEvent.make('org.dxos.test.lateTraceSink');
const lateSinkMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.lateTraceSink'), name: 'Late TraceSink' });

class OtherService extends Context.Service<OtherService, { value: string }>()('org.dxos.test.otherService') {}

const otherMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.otherLayerSpec'), name: 'Other LayerSpec' });

/** A manager hosting the process manager, with the framework capabilities a host contributes itself. */
const makeManager = (opts: { plugins: Plugin.Plugin[]; enabled: string[] }) => {
  const manager = PluginManager.make({
    pluginLoader: () => Effect.die(new Error('not implemented')),
    plugins: [ProcessManagerPlugin.make(), ...opts.plugins],
    enabled: opts.enabled,
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
  return manager;
};

const resolveWith = <S>(manager: PluginManager.PluginManager, tag: Context.Key<any, S>) =>
  Effect.gen(function* () {
    const resolver = yield* manager.capabilities.waitFor(Capabilities.ServiceResolver);
    return yield* Effect.scoped(resolver.resolve(tag, {}));
  });

const captureErrors = () => {
  const errors: LogEntry[] = [];
  const remove = log.addProcessor((_config: LogConfig, entry: LogEntry) => {
    if (entry.level === LogLevel.ERROR) {
      errors.push(entry);
    }
  });
  return { errors, remove };
};

describe('process manager late LayerSpecs', () => {
  it.effect('resolves a LayerSpec contributed after the runtime was built', () =>
    Effect.gen(function* () {
      const { errors, remove } = captureErrors();
      let builds = 0;

      // Gated on a runtime event rather than Startup, so it contributes AFTER the stack was built.
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
                    Layer.sync(TestService, () => {
                      builds++;
                      return { value: 'late' };
                    }),
                  ),
                ),
              ]),
          }),
        ),
      );

      const manager = makeManager({ plugins: [Late()], enabled: [lateMeta.profile.key] });
      yield* manager.activate(ActivationEvents.Startup);

      // Builds the application slice before the late spec exists.
      const before = yield* resolveWith(manager, Capability.Service);
      const missing = yield* Effect.exit(resolveWith(manager, TestService));
      expect(missing._tag).toBe('Failure');

      yield* manager.activate(LateEvent);

      expect(yield* resolveWith(manager, TestService)).toEqual({ value: 'late' });
      expect(yield* resolveWith(manager, TestService)).toEqual({ value: 'late' });
      expect(builds).toBe(1);
      // Services the slice held before the late spec arrived are the same instances afterwards.
      expect(yield* resolveWith(manager, Capability.Service)).toBe(before);
      expect(errors).toHaveLength(0);

      remove();
    }),
  );

  it.effect('makes the services of a plugin enabled after boot available without a reload', () =>
    Effect.gen(function* () {
      const { errors, remove } = captureErrors();

      // Same gating as `AppCapability.layerSpec`, on a plugin that is only enabled once the app runs.
      const Other = Plugin.make(
        Plugin.define(otherMeta).pipe(
          Plugin.addModule({
            id: 'other-layer-spec',
            activatesOn: ActivationEvents.Startup,
            provides: [Capabilities.LayerSpec],
            activate: () =>
              Effect.succeed([
                Capability.contribute(
                  Capabilities.LayerSpec,
                  // Requires a framework service, as plugin-sandbox's SandboxService spec does.
                  LayerSpec.make(
                    { affinity: 'application', requires: [Capability.Service], provides: [OtherService] },
                    () =>
                      Layer.effect(
                        OtherService,
                        Effect.map(Capability.Service, () => ({ value: 'enabled' })),
                      ),
                  ),
                ),
              ]),
          }),
        ),
      );

      const manager = makeManager({ plugins: [Other()], enabled: [] });
      yield* manager.activate(ActivationEvents.Startup);
      yield* resolveWith(manager, Capability.Service);
      expect((yield* Effect.exit(resolveWith(manager, OtherService)))._tag).toBe('Failure');

      yield* manager.enable(otherMeta.profile.key);

      expect(yield* resolveWith(manager, OtherService)).toEqual({ value: 'enabled' });
      expect(errors).toHaveLength(0);

      remove();
    }),
  );

  it.effect('rejects a late LayerSpec that closes a cycle and keeps admitting the others', () =>
    Effect.gen(function* () {
      const { errors, remove } = captureErrors();

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
                  LayerSpec.make({ affinity: 'application', requires: [OtherService], provides: [TestService] }, () =>
                    Layer.succeed(TestService, { value: 'cyclic' }),
                  ),
                ),
                Capability.contribute(
                  Capabilities.LayerSpec,
                  LayerSpec.make({ affinity: 'application', requires: [TestService], provides: [OtherService] }, () =>
                    Layer.succeed(OtherService, { value: 'cyclic' }),
                  ),
                ),
              ]),
          }),
        ),
      );
      const Other = Plugin.make(
        Plugin.define(otherMeta).pipe(
          Plugin.addModule({
            id: 'other-layer-spec',
            activatesOn: LateEvent,
            provides: [Capabilities.LayerSpec],
            activate: () =>
              Effect.succeed([
                Capability.contribute(
                  Capabilities.LayerSpec,
                  LayerSpec.make({ affinity: 'application', requires: [], provides: [ProbeService] }, () =>
                    Layer.succeed(ProbeService, { value: 'fine' }),
                  ),
                ),
              ]),
          }),
        ),
      );

      const manager = makeManager({
        plugins: [Late(), Other()],
        enabled: [lateMeta.profile.key, otherMeta.profile.key],
      });
      yield* manager.activate(ActivationEvents.Startup);
      const before = yield* resolveWith(manager, Capability.Service);

      yield* manager.activate(LateEvent);

      expect(yield* resolveWith(manager, ProbeService)).toEqual({ value: 'fine' });
      expect(yield* resolveWith(manager, Capability.Service)).toBe(before);
      // The second cyclic spec is the one that closes the cycle; the first is admitted on its own.
      const rejected = errors.filter((entry) => String(entry.message).includes('LayerSpec rejected'));
      expect(rejected).toHaveLength(1);

      remove();
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

describe('one process manager', () => {
  const remoteMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.remoteRuntime'), name: 'Remote runtime' });
  const edge = { location: { kind: 'edge', space: SpaceId.random() } } as const;

  /** A plugin contributing a remote manager whose `list` records the spaces it was asked about, as EDGE's does. */
  const RemoteRuntime = (listed: string[]) =>
    Plugin.make(
      Plugin.define(remoteMeta).pipe(
        Plugin.addModule({
          id: 'remote-process-manager',
          activatesOn: ActivationEvents.Startup,
          provides: [Capabilities.LayerSpec],
          activate: () =>
            Effect.succeed([
              Capability.contribute(
                Capabilities.LayerSpec,
                LayerSpec.make(
                  {
                    affinity: 'application',
                    requires: [Registry.AtomRegistry],
                    provides: [RemoteProcessManager.Service],
                  },
                  () =>
                    Layer.effect(
                      RemoteProcessManager.Service,
                      Effect.gen(function* () {
                        const noop = yield* RemoteProcessManager.Service;
                        return {
                          ...noop,
                          list: ({ spaceId }: RemoteProcessManager.ListOptions) =>
                            Effect.sync(() => {
                              listed.push(spaceId);
                              return [];
                            }),
                        };
                      }),
                    ).pipe(Layer.provide(RemoteProcessManager.layerNoop)),
                ),
              ),
            ]),
        }),
      ),
    );

  it.effect("sends the app's edge control to the remote manager a plugin contributes", () =>
    Effect.gen(function* () {
      const listed: string[] = [];
      const manager = makeManager({ plugins: [RemoteRuntime(listed)()], enabled: [remoteMeta.profile.key] });
      yield* manager.activate(ActivationEvents.Startup);

      // The app's manager and the stack's (the one `AgentService` resolves) are the same one.
      const appManager = yield* manager.capabilities.waitFor(Capabilities.ProcessManager);
      const stackManager = yield* resolveWith(manager, Process.ManagerService);
      yield* appManager.handles(edge);
      yield* stackManager.handles(edge);
      expect(listed).toEqual([edge.location.space, edge.location.space]);
    }),
  );

  it.effect('falls back to no remote control without such a plugin, and keeps local control', () =>
    Effect.gen(function* () {
      const manager = makeManager({ plugins: [], enabled: [] });
      yield* manager.activate(ActivationEvents.Startup);

      const appManager = yield* manager.capabilities.waitFor(Capabilities.ProcessManager);
      expect(yield* appManager.handles()).toEqual([]);
      const remote = yield* Effect.exit(appManager.handles(edge));
      expect(Exit.isFailure(remote) && String(Cause.squash(remote.cause))).toContain('offers no process control');
    }),
  );
});
