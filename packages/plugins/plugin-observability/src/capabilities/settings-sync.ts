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

import { applyTelemetryEnabled, readTelemetryEnabled, writeTelemetryEnabled } from '../util';

/**
 * Keeps the telemetry opt-in and the settings space agreeing. The first device to see an unset
 * space writes its local choice in; from then on the space is the source and every device applies
 * what it holds, including a change that arrives from another device while running.
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
      log('no settings space; the telemetry opt-in stays local');
      return [];
    }
    yield* Effect.promise(() => settingsSpace.waitUntilReady());

    const context = { observability, namespace, registry, settingsAtom };
    const sync = Effect.fnUntraced(function* () {
      const remote = readTelemetryEnabled(settingsSpace);
      if (remote === undefined) {
        writeTelemetryEnabled(settingsSpace, registry.get(settingsAtom).enabled);
        return;
      }
      // Only on a difference: re-enabling an already enabled backend is not free (PostHog rewrites
      // its opt-in, the local mirror is rewritten).
      if (remote !== registry.get(settingsAtom).enabled) {
        yield* applyTelemetryEnabled(context, remote);
      }
    });

    yield* sync();
    const unsubscribe = Obj.subscribe(settingsSpace.properties, () => {
      EffectEx.runPromise(sync()).catch((err) => log.catch(err));
    });
    yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));

    return [];
  }),
);
