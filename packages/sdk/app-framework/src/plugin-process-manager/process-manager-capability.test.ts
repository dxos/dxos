//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Trace from '@dxos/compute/Trace';
import { Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { type LogConfig, type LogEntry, LogLevel, log } from '@dxos/log';

import { ActivationEvents, Capabilities } from '../common';
import { ActivationEvent, Capability, Plugin, PluginManager } from '../core';
import { ProcessManagerPlugin } from './ProcessManagerPlugin';

const LateEvent = ActivationEvent.make('org.dxos.test.lateLayerSpec');

class TestService extends Context.Tag('org.dxos.test.lateService')<TestService, { value: string }>() {}

const lateMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.lateLayerSpec'), name: 'Late LayerSpec' });

const LateSinkEvent = ActivationEvent.make('org.dxos.test.lateTraceSink');
const lateSinkMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.lateTraceSink'), name: 'Late TraceSink' });

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

  /**
   * Unlike a LayerSpec, a trace sink must NOT be snapshotted: sinks are stateless observers, and
   * plugin-progress contributes its one from an on-demand module that lands after this one. When the
   * merged sink was a boot snapshot, every operation's `status.update` reached the durable sink while
   * the progress meters stayed permanently empty — a silent failure with no error to follow.
   */
  it.effect('delivers to a TraceSink contributed after the runtime was built', () =>
    Effect.gen(function* () {
      const written: string[] = [];
      const Late = Plugin.make(
        Plugin.define(lateSinkMeta).pipe(
          Plugin.addModule({
            id: 'late-trace-sink',
            activatesOn: LateSinkEvent,
            provides: [Capabilities.TraceSink],
            activate: () =>
              Effect.succeed([
                Capability.contribute(Capabilities.TraceSink, () => ({
                  write: (message) => written.push(...message.events.map((event) => event.type)),
                })),
              ]),
          }),
        ),
      );

      const manager = PluginManager.make({
        pluginLoader: () => Effect.die(new Error('not implemented')),
        plugins: [ProcessManagerPlugin(), Late()],
        enabled: [lateSinkMeta.profile.key],
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
      const runtime = manager.capabilities.get(Capabilities.ProcessManagerRuntime);
      expect(runtime).toBeDefined();

      // The sink joins only now — after the runtime (and its merged sink) was built.
      yield* manager.activate(LateSinkEvent);

      // Write through the runtime's merged sink, which is what every process's trace service holds.
      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const merged = yield* Trace.TraceSink;
            merged.write(
              Obj.make(Trace.Message, {
                meta: { runtimeName: Trace.CommonRuntimeName.local },
                isEphemeral: true,
                events: [{ type: 'status.update', timestamp: 0, data: { progress: { key: 'test#late' } } }],
              }),
            );
          }),
        ),
      );

      expect(written).toEqual(['status.update']);
    }),
  );
});
