//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import * as Observability from '@dxos/observability/Observability';

import { meta } from '#meta';
import { ObservabilityCapabilities, ObservabilityOperation, Settings } from '#types';

const handler: Operation.WithHandler<typeof ObservabilityOperation.SetEnabled> = ObservabilityOperation.SetEnabled.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const namespace = yield* Capability.get(ObservabilityCapabilities.Namespace);
      const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
      const capabilities = yield* Capability.Service;
      const newEnabled = input.state;

      observability.events.captureEvent('observability.toggle', {
        enabled: newEnabled,
      });

      if (newEnabled) {
        yield* observability.enable();
      } else {
        yield* observability.disable();
      }
      yield* Effect.promise(() => Observability.storeObservabilityDisabled(namespace, !newEnabled));

      const settingsObj = capabilities
        .getAll(AppCapabilities.Settings)
        .find((candidate: AppCapabilities.Settings) => candidate.prefix === meta.profile.key);
      if (settingsObj) {
        const registry = capabilities.get(Capabilities.AtomRegistry);
        const settings = registry.get(settingsObj.atom) as Settings.Settings;
        registry.set(settingsObj.atom, { ...settings, enabled: newEnabled });
      }

      return newEnabled;
    }),
  ),
);

export default handler;
