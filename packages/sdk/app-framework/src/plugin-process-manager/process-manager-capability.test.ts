//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as LayerSpec from '@dxos/compute/LayerSpec';
import { DXN } from '@dxos/keys';
import { type LogConfig, type LogEntry, LogLevel, log } from '@dxos/log';

import { ActivationEvents, Capabilities } from '../common';
import { ActivationEvent, Capability, Plugin, PluginManager } from '../core';
import { ProcessManagerPlugin } from './ProcessManagerPlugin';

const LateEvent = ActivationEvent.make('org.dxos.test.lateLayerSpec');

class TestService extends Context.Service<TestService, { value: string }>()('org.dxos.test.lateService') {}

const lateMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.lateLayerSpec'), name: 'Late LayerSpec' });

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
