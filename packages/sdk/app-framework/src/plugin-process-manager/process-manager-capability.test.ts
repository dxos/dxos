//
// Copyright 2026 DXOS.org
//

import { describe, expect, it, test } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { type LogConfig, type LogEntry, LogLevel, log } from '@dxos/log';

import { ActivationEvents, Capabilities } from '../common/index.ts';
import { ActivationEvent, Capability, Plugin, PluginManager } from '../core/index.ts';
import { makeDynamicTraceSink } from './process-manager-capability.ts';
import { ProcessManagerPlugin } from './ProcessManagerPlugin.ts';

const LateEvent = ActivationEvent.make('org.dxos.test.lateLayerSpec');

class TestService extends Context.Service<TestService, { value: string }>()('org.dxos.test.lateService') {}

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
