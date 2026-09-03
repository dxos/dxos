//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

import { ObservabilityCapabilities } from '#types';

import { applyTelemetrySettings, readTelemetrySettings, writeTelemetrySettings } from '../util';

/**
 * Keeps the telemetry preferences and the settings space agreeing. The first device to see an
 * unset space writes its local choice in; from then on the space is the source and every device
 * applies what it holds, including changes that arrive from another device while running.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ObservabilityCapabilities.ClientCapability;
    const observability = yield* ObservabilityCapabilities.Observability;
    const namespace = yield* ObservabilityCapabilities.Namespace;
    const settingsAtom = yield* ObservabilityCapabilities.Settings;
    const registry = yield* Capabilities.AtomRegistry;

    const settingsSpace = AppSpace.getSettingsSpace(client);
    if (!settingsSpace) {
      log('no settings space; telemetry preferences stay local');
      return [];
    }
    yield* Effect.promise(() => settingsSpace.waitUntilReady());

    const context = { observability, namespace, registry, settingsAtom };
    const sync = Effect.fnUntraced(function* () {
      const remote = readTelemetrySettings(settingsSpace);
      if (remote.enabled === undefined && remote.aiContentCapture === undefined) {
        writeTelemetrySettings(settingsSpace, registry.get(settingsAtom));
        return;
      }

      // Only what differs: re-enabling an already enabled backend is not free (PostHog rewrites
      // its opt-in, the local mirror is rewritten).
      const local = registry.get(settingsAtom);
      yield* applyTelemetrySettings(context, {
        enabled: remote.enabled !== undefined && remote.enabled !== local.enabled ? remote.enabled : undefined,
        aiContentCapture:
          remote.aiContentCapture !== undefined && remote.aiContentCapture !== local.aiContentCapture
            ? remote.aiContentCapture
            : undefined,
      });
    });

    yield* sync();
    const unsubscribe = Obj.subscribe(settingsSpace.properties, () => {
      EffectEx.runPromise(sync()).catch((err) => log.catch(err));
    });
    yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));

    return [];
  }),
);
